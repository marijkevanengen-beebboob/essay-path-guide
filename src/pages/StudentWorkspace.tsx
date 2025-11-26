import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, AlertTriangle, Sparkles, Download, CheckCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

type AssignmentCriterion = {
  id: string;
  label: string;
  description: string;
  isAiSuggestion?: boolean;
  isCustom?: boolean;
};

type AssignmentData = {
  level: string;
  assignmentText: string;
  criteria: AssignmentCriterion[];
};

type FeedbackItem = {
  id: string;
  range: { start: number; end: number };
  color: string;
  type: "spelling" | "grammar" | "structure" | "content";
  hint: string;
};

const StudentWorkspace = () => {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const [assignmentData, setAssignmentData] = useState<AssignmentData | null>(null);
  const [isInvalidCode, setIsInvalidCode] = useState(false);
  const [text, setText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [feedbackTokens, setFeedbackTokens] = useState(3);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);
  const [showExitWarning, setShowExitWarning] = useState(true);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  
  // PDF generation tracking states
  const [firstFeedbackVersion, setFirstFeedbackVersion] = useState<string>("");
  const [hasRequestedFeedbackOnce, setHasRequestedFeedbackOnce] = useState(false);
  const [copyPasteTriggered, setCopyPasteTriggered] = useState(false);

  const activeFeedback = feedback.find(f => f.id === activeFeedbackId) || null;

  useEffect(() => {
    console.log("StudentWorkspace - Code from URL:", code);
    console.log("StudentWorkspace - All localStorage keys:", Object.keys(localStorage));
    
    if (!code) {
      console.log("StudentWorkspace - No code provided");
      setIsInvalidCode(true);
      return;
    }
    
    const key = `assignment_${code}`;
    console.log("StudentWorkspace - Looking for key:", key);
    const storedData = localStorage.getItem(key);
    console.log("StudentWorkspace - Stored data:", storedData);
    
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        console.log("StudentWorkspace - Parsed data:", parsedData);
        setAssignmentData(parsedData);
        setIsInvalidCode(false);
      } catch (error) {
        console.error("Error parsing assignment data:", error);
        setIsInvalidCode(true);
        toast.error("Ongeldige opdrachtdata");
      }
    } else {
      console.log("StudentWorkspace - No data found for key:", key);
      setIsInvalidCode(true);
      toast.error("Deze link is ongeldig of verlopen");
    }
  }, [code]);

  useEffect(() => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [text]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasDownloaded && text.trim()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasDownloaded, text]);

  const handleTextChange = (value: string) => {
    const words = value.trim().split(/\s+/).filter(Boolean).length;
    if (words <= 1000) {
      setText(value);
    } else {
      toast.error("Maximaal 1000 woorden bereikt");
    }
  };

  const getHighlightedText = (text: string, feedbackItems: FeedbackItem[]) => {
    if (!feedbackItems || feedbackItems.length === 0) return text;

    const sorted = [...feedbackItems].sort((a, b) => a.range.start - b.range.start);
    const segments: React.ReactNode[] = [];
    let currentIndex = 0;

    sorted.forEach((item, idx) => {
      const { start, end } = item.range;

      if (start > currentIndex) {
        segments.push(
          <span key={`plain-${idx}-${currentIndex}`}>
            {text.slice(currentIndex, start)}
          </span>
        );
      }

      segments.push(
        <span
          key={`hl-${item.id}`}
          className={`${item.color} rounded-sm cursor-pointer hover:opacity-80 transition-opacity`}
          onClick={() => setActiveFeedbackId(item.id)}
        >
          {text.slice(start, end)}
        </span>
      );

      currentIndex = end;
    });

    if (currentIndex < text.length) {
      segments.push(
        <span key={`plain-end-${currentIndex}`}>
          {text.slice(currentIndex)}
        </span>
      );
    }

    return segments;
  };

  const requestFeedback = async () => {
    if (feedbackTokens === 0) {
      toast.error("Geen feedback-kansen meer beschikbaar");
      return;
    }

    if (!text.trim()) {
      toast.error("Schrijf eerst wat tekst voordat je feedback vraagt");
      return;
    }

    if (!assignmentData || !assignmentData.criteria || assignmentData.criteria.length === 0) {
      toast.error("Er zijn geen beoordelingscriteria ingesteld door de docent");
      return;
    }

    // Track first feedback request for PDF
    if (!hasRequestedFeedbackOnce) {
      setFirstFeedbackVersion(text);
      setHasRequestedFeedbackOnce(true);
    }

    setFeedbackTokens((prev) => prev - 1);

    // Show loading state
    const loadingToast = toast.info("AI analyseert je tekst...", {
      description: "Dit kan enkele seconden duren"
    });

    try {
      // Call the secure edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          assignmentText: assignmentData.assignmentText,
          level: assignmentData.level,
          criteria: assignmentData.criteria
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fout bij ophalen van feedback');
      }

      const generatedFeedback: FeedbackItem[] = await response.json();

      if (!Array.isArray(generatedFeedback) || generatedFeedback.length === 0) {
        toast.error("Geen feedback ontvangen. Probeer het opnieuw.");
        return;
      }

      setFeedback(generatedFeedback);
      toast.success(`${generatedFeedback.length} feedbackpunten ontvangen!`);

    } catch (error) {
      console.error('Error requesting feedback:', error);
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
      toast.error("Fout bij ophalen van feedback", {
        description: errorMessage
      });
      // Refund the token on error
      setFeedbackTokens((prev) => prev + 1);
    }
  };

  const dismissFeedback = (id: string) => {
    setFeedback(feedback.filter(f => f.id !== id));
  };

  const downloadPDF = () => {
    // In production, this would generate and download an actual PDF
    toast.success("PDF wordt gegenereerd...");
    setHasDownloaded(true);
    
    setTimeout(() => {
      toast.success("PDF gedownload!");
    }, 1500);
  };

  const wordProgress = (wordCount / 1000) * 100;

  if (isInvalidCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Link ongeldig
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Deze link is ongeldig of verlopen. Vraag je docent om een nieuwe link.
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              Terug naar home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Schrijfomgeving</h1>
              <p className="text-sm text-muted-foreground">Werken aan je opdracht</p>
            </div>
          </div>
          <Badge variant="outline" className="hidden md:flex">
            Code: {code?.toUpperCase() || 'ABC-123'}
          </Badge>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Privacywaarschuwing:</strong> Typ geen privégegevens zoals telefoonnummers, 
            adressen of achternamen in je tekst.
          </AlertDescription>
        </Alert>

        <div className="max-w-4xl mx-auto space-y-4">
            {assignmentData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Opdracht</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={assignmentData.assignmentText}
                    readOnly
                    className="min-h-[100px] resize-none bg-muted/50"
                  />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Woordenteller</span>
                      <Badge variant={wordCount > 900 ? "destructive" : "secondary"}>
                        {wordCount} / 1000
                      </Badge>
                    </div>
                    <Progress value={wordProgress} className="h-2" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      {feedbackTokens} feedback {feedbackTokens === 1 ? "kans" : "kansen"}
                    </span>
                  </div>
                </div>

                <Textarea
                  placeholder="Begin hier met schrijven..."
                  value={text}
                  onChange={(e) => handleTextChange(e.target.value)}
                  className="min-h-[500px] font-serif text-base leading-relaxed resize-none"
                />

                {feedback.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h3 className="text-sm font-medium">Gemarkeerde tekst (klik op markering voor feedback)</h3>
                    <div className="p-3 rounded-md border bg-muted/40 whitespace-pre-wrap font-serif text-base leading-relaxed">
                      {getHighlightedText(text, feedback)}
                    </div>
                  </div>
                )}

                {activeFeedback && (
                  <div className="mt-4">
                    <Card className="bg-card border shadow-md">
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center justify-between">
                          Feedback
                          <Badge variant="outline" className="text-xs capitalize">
                            {activeFeedback.type}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm leading-relaxed">
                          {activeFeedback.hint}
                        </p>
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            onClick={() => {
                              setFeedback(prev => prev.filter(f => f.id !== activeFeedback.id));
                              setActiveFeedbackId(null);
                              toast.success("Feedback geaccepteerd");
                            }}
                          >
                            Accepteren
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setFeedback(prev => prev.filter(f => f.id !== activeFeedback.id));
                              setActiveFeedbackId(null);
                              toast.message("Feedback genegeerd");
                            }}
                          >
                            Negeren
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={requestFeedback}
                    disabled={feedbackTokens === 0 || !text.trim()}
                    className="flex-1"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Vraag Feedback ({feedbackTokens})
                  </Button>
                  <Button
                    onClick={downloadPDF}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentWorkspace;
