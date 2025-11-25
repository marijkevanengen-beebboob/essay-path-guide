import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, PenTool } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            AI Schrijfassistent
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Een intelligente schrijfomgeving voor het onderwijs. Docenten creëren opdrachten, 
            leerlingen schrijven met gerichte AI-feedback.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate("/teacher")}>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Docent</CardTitle>
              <CardDescription>
                Stel opdrachten samen met aangepaste beoordelingscriteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="default">
                Opdracht Configureren
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate("/student")}>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <PenTool className="w-6 h-6 text-accent" />
              </div>
              <CardTitle>Leerling</CardTitle>
              <CardDescription>
                Start met schrijven en ontvang gerichte AI-feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                Begin met Schrijven
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Ontwikkeld voor het Nederlandse onderwijs • Referentieniveaus 1F-4F</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
