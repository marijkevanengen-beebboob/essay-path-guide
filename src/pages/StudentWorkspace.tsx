import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, AlertTriangle, Sparkles, Download, CheckCircle, Shield, ChevronDown } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { generateStudentPDF } from "@/lib/generatePDF";


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
  location: string;
  problem: string;
  advice: string;
  status?: 'accepted' | 'rejected' | 'open';
};

type ChecklistResult = {
  id: string;
  label: string;
  met: boolean;
  explanation: string;
};

type FeedbackRound = {
  round: number;
  feedback: FeedbackItem[];
  checklist: ChecklistResult[];
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
  const [checklistResults, setChecklistResults] = useState<ChecklistResult[]>([]);
  const [previousFeedback, setPreviousFeedback] = useState<any[]>([]);
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackRound[]>([]);
  const [activeChecklistId, setActiveChecklistId] = useState<string | null>(null);
  const [checklistOpen, setChecklistOpen] = useState(true);
  const [showExitWarning, setShowExitWarning] = useState(true);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  
  // PDF generation tracking states
  const [firstFeedbackVersion, setFirstFeedbackVersion] = useState<string>("");
  const [hasRequestedFeedbackOnce, setHasRequestedFeedbackOnce] = useState(false);
  const [copyPasteTriggered, setCopyPasteTriggered] = useState(false);

  

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

  // Save work to localStorage
  useEffect(() => {
    if (code && text) {
      localStorage.setItem(`assignment_${code}_currentText`, text);
    }
  }, [text, code]);

  useEffect(() => {
    if (code && firstFeedbackVersion) {
      localStorage.setItem(`assignment_${code}_firstVersion`, firstFeedbackVersion);
    }
  }, [firstFeedbackVersion, code]);

  // Load saved work from localStorage
  useEffect(() => {
    if (code) {
      const savedText = localStorage.getItem(`assignment_${code}_currentText`);
      const savedFirstVersion = localStorage.getItem(`assignment_${code}_firstVersion`);
      
      if (savedText) {
        setText(savedText);
      }
      if (savedFirstVersion) {
        setFirstFeedbackVersion(savedFirstVersion);
        setHasRequestedFeedbackOnce(true);
      }
    }
  }, [code]);

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

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    const wordCount = pastedText.trim().split(/\s+/).filter(Boolean).length;
    
    if (wordCount > 50) {
      setCopyPasteTriggered(true);
      console.log('Large paste detected:', wordCount, 'words');
    }
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

    // Calculate current round (3 tokens = round 1, 2 tokens = round 2, 1 token = round 3)
    const currentRound = 4 - feedbackTokens;
    
    setFeedbackTokens((prev) => prev - 1);

    // Show loading state
    const loadingToast = toast.info(`AI analyseert je tekst... (Ronde ${currentRound}/3)`, {
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
          criteria: assignmentData.criteria,
          round: currentRound,
          previousFeedback: previousFeedback
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fout bij ophalen van feedback');
      }

      const responseData = await response.json();

      // All rounds now return checklist results
      setChecklistResults(responseData.checklistResults || []);
      const newFeedback = (responseData.feedbackItems || []).map((item: any) => ({
        ...item,
        status: 'open' as const
      }));
      setFeedback(newFeedback);
      
      // Store this round in history
      const newRound: FeedbackRound = {
        round: currentRound,
        feedback: newFeedback,
        checklist: responseData.checklistResults || []
      };
      setFeedbackHistory(prev => [...prev, newRound]);
      
      if (currentRound === 1) {
        setPreviousFeedback(newFeedback);
      } else {
        setPreviousFeedback([...previousFeedback, ...newFeedback]);
      }
      
      if (newFeedback.length === 0) {
        toast.info("Checklist bijgewerkt", {
          description: "De belangrijkste inhoudelijke punten zijn al benoemd"
        });
      } else {
        toast.success(`Checklist bijgewerkt + ${newFeedback.length} ${currentRound > 1 ? 'nieuwe ' : ''}feedbackpunten`, {
          description: "Klik op onderstreepte tekst om feedback te zien"
        });
      }

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


  const downloadPDF = async () => {
    // Validation
    if (!text.trim()) {
      toast.error("Schrijf eerst tekst voordat je een PDF kunt downloaden");
      return;
    }

    if (!assignmentData || !code) {
      toast.error("Opdrachtgegevens ontbreken");
      return;
    }

    toast.info("PDF wordt gegenereerd...", {
      description: "AI genereert een feedbackrapport"
    });

    try {
      let feedbackSummary = '';

      // If feedback was requested, generate AI reflection
      if (hasRequestedFeedbackOnce && feedbackHistory.length > 0) {
        try {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-reflection`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              firstFeedbackVersion: firstFeedbackVersion || text,
              finalText: text,
              feedbackHistory: feedbackHistory.map(round => ({
                round: round.round,
                feedback: round.feedback.map(f => ({
                  location: f.location,
                  problem: f.problem,
                  advice: f.advice,
                  status: f.status || 'open'
                }))
              })),
              lastChecklist: checklistResults,
              assignmentText: assignmentData.assignmentText,
              criteria: assignmentData.criteria,
              level: assignmentData.level
            }),
          });

          if (response.ok) {
            const data = await response.json();
            feedbackSummary = data.report;
          } else {
            console.error('Failed to generate reflection:', await response.text());
            feedbackSummary = 'Er is een fout opgetreden bij het genereren van het feedbackrapport. De docent kan de ontwikkeling beoordelen op basis van Versie 1 en de Eindversie.';
          }
        } catch (error) {
          console.error('Error generating reflection:', error);
          feedbackSummary = 'Er is een fout opgetreden bij het genereren van het feedbackrapport. De docent kan de ontwikkeling beoordelen op basis van Versie 1 en de Eindversie.';
        }
      }

      // Generate PDF
      generateStudentPDF({
        code: code,
        level: assignmentData.level,
        assignmentText: assignmentData.assignmentText,
        firstFeedbackVersion: firstFeedbackVersion || "",
        finalText: text,
        hasRequestedFeedbackOnce,
        feedbackSummary: feedbackSummary || undefined
      });

      setHasDownloaded(true);
      toast.success("PDF succesvol gedownload!");

    } catch (error) {
      console.error('Error generating PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
      toast.error("Fout bij genereren van PDF", {
        description: errorMessage
      });
    }
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

        <Alert className="border-2 border-destructive/50 bg-destructive/5">
          <Shield className="h-5 w-5 text-destructive" />
          <AlertDescription className="space-y-2">
            <div className="font-semibold text-base text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Privacy & AI-gebruik
            </div>
            <div className="text-sm space-y-1">
              <p>
                <strong>Belangrijk:</strong> Je tekst wordt geanalyseerd door een AI-systeem om je te helpen met feedback.
              </p>
              <p className="text-destructive font-medium">
                Deel NOOIT persoonlijke of privacy-gevoelige informatie zoals:
              </p>
              <ul className="list-disc list-inside ml-2 space-y-0.5 text-muted-foreground">
                <li>Telefoonnummers (bijv. 06-nummers)</li>
                <li>Adressen of postcodes</li>
                <li>Achternamen van jezelf of anderen</li>
                <li>E-mailadressen of gebruikersnamen</li>
                <li>Geboortedatums of BSN-nummers</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        {assignmentData && (
          <Card className="max-w-4xl mx-auto">
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

        <div className="flex gap-6 items-start">
          {/* Left Column - Writing Area */}
          <div className="flex-1 space-y-4">
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
                  onPaste={handlePaste}
                  className="min-h-[500px] font-serif text-base leading-relaxed resize-none"
                />

                <div className="flex gap-2">
                  <Button
                    onClick={requestFeedback}
                    disabled={feedbackTokens === 0 || !text.trim()}
                    className="flex-1"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Vraag Feedback ({feedbackTokens === 0 ? "0 - Geen meer beschikbaar" : `${feedbackTokens}/3`})
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

          {/* Right Column - Checklist & Feedback */}
          <div className="w-96 space-y-4 sticky top-4">
            {checklistResults.length > 0 && (
              <Collapsible open={checklistOpen} onOpenChange={setChecklistOpen}>
                <Card className="border-2 border-primary/20">
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardTitle className="text-base flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Checklist
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${checklistOpen ? 'rotate-180' : ''}`} />
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-1">
                      {checklistResults.map((item) => (
                        <div key={item.id} className="group">
                          <div
                            className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setActiveChecklistId(activeChecklistId === item.id ? null : item.id)}
                            onMouseEnter={() => setActiveChecklistId(item.id)}
                            onMouseLeave={() => setActiveChecklistId(null)}
                          >
                            <div className="flex-shrink-0">
                              {item.met ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                              )}
                            </div>
                            <p className="text-sm flex-1">
                              {item.label}
                            </p>
                          </div>
                          {activeChecklistId === item.id && (
                            <p className="text-xs text-muted-foreground ml-6 px-2 py-1 bg-muted/30 rounded-sm mt-0.5 animate-in fade-in-50 slide-in-from-top-1 duration-200">
                              {item.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {feedback.length > 0 && (
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {feedback.map((item) => (
                    <Alert key={item.id} className="bg-muted/30">
                      <AlertDescription className="space-y-3">
                        <div>
                          <div className="font-semibold text-sm mb-1">📍 {item.location}</div>
                          <div className="text-sm mb-2">
                            <span className="font-medium">Probleem:</span> {item.problem}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Advies:</span> {item.advice}
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              // Update status in feedback history
                              setFeedbackHistory(prev => prev.map(round => ({
                                ...round,
                                feedback: round.feedback.map(f => 
                                  f.id === item.id ? { ...f, status: 'accepted' as const } : f
                                )
                              })));
                              setFeedback(prev => prev.filter(f => f.id !== item.id));
                              toast.success("Feedback geaccepteerd");
                            }}
                            className="flex-1"
                          >
                            Accepteren
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Update status in feedback history
                              setFeedbackHistory(prev => prev.map(round => ({
                                ...round,
                                feedback: round.feedback.map(f => 
                                  f.id === item.id ? { ...f, status: 'rejected' as const } : f
                                )
                              })));
                              setFeedback(prev => prev.filter(f => f.id !== item.id));
                              toast.message("Feedback genegeerd");
                            }}
                            className="flex-1"
                          >
                            Negeren
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentWorkspace;
