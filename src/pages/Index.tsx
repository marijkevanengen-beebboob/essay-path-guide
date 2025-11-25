import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, PenTool } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background via-50% to-accent/10 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4 animate-fade-in-up">
          <h1 className="text-5xl md:text-7xl font-fredoka font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-bounce-gentle">
            PUNT!
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            Een intelligente schrijfomgeving voor leerlingen, door docenten. Zo simpel is het.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card
            className="hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer group border-2 hover:border-primary/50 animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
            onClick={() => navigate("/teacher")}
          >
            <CardHeader>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:from-primary/30 group-hover:to-primary/20 transition-all group-hover:rotate-6 duration-300">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-fredoka">Docent</CardTitle>
              <CardDescription className="text-base">
                Stel opdrachten samen met aangepaste beoordelingscriteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full font-fredoka text-base" variant="default">
                Opdracht Configureren
              </Button>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer group border-2 hover:border-accent/50 animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
            onClick={() => navigate("/student")}
          >
            <CardHeader>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center mb-4 group-hover:from-accent/30 group-hover:to-accent/20 transition-all group-hover:rotate-6 duration-300">
                <PenTool className="w-8 h-8 text-accent" />
              </div>
              <CardTitle className="text-2xl font-fredoka">Leerling</CardTitle>
              <CardDescription className="text-base">
                Start met schrijven en ontvang gerichte AI-feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full font-fredoka text-base" variant="outline">
                Begin met Schrijven
              </Button>
            </CardContent>
          </Card>
        </div>

        <div
          className="text-center text-sm text-muted-foreground animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <p className="font-medium">Ontwikkeld voor het Nederlandse onderwijs • Referentieniveaus 1F-4F</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
