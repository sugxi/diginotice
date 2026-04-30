// Cleanup expired notices, generate notifications for relevant students,
// and send transactional emails for important events.
// Invoked from the client every 5 minutes (and on page load).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '@supabase/supabase-js/cors';

type Urgency = 'low' | 'normal' | 'important' | 'urgent' | 'expired';

function computeUrgency(deadlineISO: string): Urgency {
  const diffDays = (new Date(deadlineISO).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'expired';
  if (diffDays <= 4) return 'urgent';
  if (diffDays <= 7) return 'important';
  if (diffDays <= 15) return 'normal';
  return 'low';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    // 1) Snapshot expired notices BEFORE deleting to send 'missed' notifications
    const { data: expiredNotices } = await supabase
      .from('notices')
      .select('id, title, visibility, target_years, target_sections, deadline')
      .lt('deadline', new Date().toISOString());

    if (expiredNotices && expiredNotices.length > 0) {
      for (const n of expiredNotices) {
        const recipients = await getRecipients(supabase, n);
        if (recipients.length > 0) {
          await supabase.from('notifications').insert(
            recipients.map((uid) => ({
              user_id: uid,
              notice_id: n.id,
              type: 'missed',
              title: 'Deadline Missed',
              message: `The deadline for "${n.title}" has passed.`,
            }))
          );
        }
      }
      // Now delete expired notices
      await supabase.from('notices').delete().lt('deadline', new Date().toISOString());
    }

    // 2) For remaining notices, check urgency changes & deadline approaching
    const { data: notices } = await supabase
      .from('notices')
      .select('id, title, deadline, base_urgency, visibility, target_years, target_sections');

    if (notices) {
      for (const n of notices) {
        const currentUrgency = computeUrgency(n.deadline);
        const stored = n.base_urgency as Urgency;

        // Urgency increased to urgent (and stored isn't urgent already)
        if (currentUrgency === 'urgent' && stored !== 'urgent' && stored !== 'expired') {
          await supabase.from('notices').update({ base_urgency: 'urgent' }).eq('id', n.id);
          const recipients = await getRecipients(supabase, n);
          if (recipients.length > 0) {
            // Avoid duplicate urgency notifications: only insert if none exist for this notice+type
            const { data: existing } = await supabase
              .from('notifications')
              .select('id')
              .eq('notice_id', n.id)
              .eq('type', 'urgency_change')
              .limit(1);
            if (!existing || existing.length === 0) {
              await supabase.from('notifications').insert(
                recipients.map((uid) => ({
                  user_id: uid,
                  notice_id: n.id,
                  type: 'urgency_change',
                  title: 'Notice now Urgent',
                  message: `"${n.title}" is now marked Urgent — deadline is within 4 days.`,
                }))
              );
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getRecipients(
  supabase: ReturnType<typeof createClient>,
  notice: { visibility: string; target_years: number[] | null; target_sections: string[] | null }
): Promise<string[]> {
  if (notice.visibility === 'faculty') {
    const { data } = await supabase.from('user_roles').select('user_id').in('role', ['admin', 'teacher']);
    return (data ?? []).map((r: any) => r.user_id);
  }
  // students matching targeting (or all students if general / empty targeting)
  const { data: students } = await supabase
    .from('user_roles')
    .select('user_id, profiles!inner(year, section)')
    .eq('role', 'student');

  return (students ?? []).filter((s: any) => {
    if (notice.visibility === 'general') return true;
    const p = s.profiles;
    const yearOk = !notice.target_years || notice.target_years.length === 0 || (p.year && notice.target_years.includes(p.year));
    const secOk = !notice.target_sections || notice.target_sections.length === 0 || (p.section && notice.target_sections.includes(p.section));
    return yearOk && secOk;
  }).map((s: any) => s.user_id);
}
