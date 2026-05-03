import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/authContext";
import { NoticeStoreProvider } from "@/lib/noticeStore";
import { StatusProvider } from "@/lib/statusContext";
import { NotificationProvider } from "@/lib/notificationContext";
import Navbar from "@/components/Navbar";
import Home from "./pages/Home";
import About from "./pages/About";
import Notifications from "./pages/Notifications";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Tasks from "./pages/Tasks";
import Analytics from "./pages/Analytics";
import NoticeDetail from "./pages/NoticeDetail";
import AdminLogin from "./pages/AdminLogin";
import AdminUsers from "./pages/AdminUsers";
import StudentProfile from "./pages/StudentProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <NoticeStoreProvider>
              <StatusProvider>
                <Toaster />
                <Sonner />
                <Navbar />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/analytics/notice/:id" element={<NoticeDetail />} />
                  <Route path="/profile" element={<StudentProfile />} />
                  <Route path="/admin-login" element={<AdminLogin />} />
                  <Route path="/admin" element={<AdminUsers />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </StatusProvider>
            </NoticeStoreProvider>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
