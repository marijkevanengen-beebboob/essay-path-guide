import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import TeacherConfig from "./pages/TeacherConfig";
import TeacherAiSetup from "./pages/TeacherAiSetup";
import StudentCodeEntry from "./pages/StudentCodeEntry";
import StudentWorkspace from "./pages/StudentWorkspace";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/teacher-ai-setup" element={<TeacherAiSetup />} />
          <Route path="/teacher" element={<TeacherConfig />} />
          <Route path="/student" element={<StudentCodeEntry />} />
          <Route path="/student/:code" element={<StudentWorkspace />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
