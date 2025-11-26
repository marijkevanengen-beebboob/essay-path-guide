import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const StudentCodeEntry = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedCode = code.trim().toUpperCase();
    
    if (!trimmedCode) {
      toast.error("Voer een geldige code in");
      return;
    }

    // Navigate to student workspace with the code
    navigate(`/student/${trimmedCode}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-fredoka">PUNT!</h1>
            <p className="text-sm text-muted-foreground">Voer je code in om te beginnen</p>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Schrijfopdracht Code</CardTitle>
            <CardDescription>
              Voer de code in die je van je docent hebt ontvangen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Bijv. ABC123XY"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="uppercase"
                  autoComplete="off"
                  autoFocus
                />
              </div>

              <Button type="submit" className="w-full">
                Verder
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Geen code ontvangen? Vraag je docent om een link of code.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentCodeEntry;
