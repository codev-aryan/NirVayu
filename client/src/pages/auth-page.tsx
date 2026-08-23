import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, InsertUser } from "@shared/schema";
import { useLocation, Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl,FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ShieldCheck, User } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  if (user) {
    return <Redirect to={user.role === "authority" ? "/authority" : "/citizen"} />;
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-background to-muted/50 relative">
      <div className="absolute top-4 right-4 z-20">
        <LanguageToggle />
      </div>

      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 justify-center">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{t("app.title")}</h1>
          </div>

          <div className="space-y-6">
            <AuthorityAuth loginMutation={loginMutation} />
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">{t("auth.orPublic")}</span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full h-12 text-lg font-semibold gap-2 border-2 hover:bg-primary hover:text-primary-foreground transition-all"
              onClick={() => setLocation("/citizen")}
            >
              <User className="w-5 h-5" /> {t("auth.enterCitizen")}
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20" />
        <div className="relative z-10 max-w-xl">
          <h2 className="text-4xl font-bold mb-6 italic">{t("auth.sideTitle")}</h2>
          <p className="text-xl opacity-90 leading-relaxed mb-8">
            {t("auth.sideDesc")}
          </p>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
              <div className="text-3xl font-bold mb-1">{t("auth.stat1.val")}</div>
              <div className="text-sm opacity-80 uppercase tracking-wider">{t("auth.stat1.label")}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
              <div className="text-3xl font-bold mb-1">{t("auth.stat2.val")}</div>
              <div className="text-sm opacity-80 uppercase tracking-wider">{t("auth.stat2.label")}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthorityAuth({ loginMutation }: { loginMutation: any }) {
  const { t } = useLanguage();
  const loginForm = useForm({
    defaultValues: { username: "", password: "" },
  });

  return (
    <Card className="border-2 border-primary/20 shadow-xl overflow-hidden">
      <CardHeader className="bg-primary/5 pb-8 pt-6">
        <div className="flex justify-between items-center mb-2">
          <CardTitle className="text-2xl">{t("auth.authorityAccess")}</CardTitle>
          <ShieldCheck className="w-6 h-6 text-primary" />
        </div>
        <CardDescription className="text-base">
          {t("auth.restrictedDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-8">
        <Form {...loginForm}>
          <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-5">
            <FormField
              control={loginForm.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("auth.authorityId")}</FormLabel>
                  <FormControl>
                    <Input className="h-11 border-2 focus-visible:ring-primary" placeholder={t("auth.idPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={loginForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("auth.accessCode")}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={t("auth.codePlaceholder")} className="h-11 border-2 focus-visible:ring-primary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full h-11 text-base font-bold shadow-lg shadow-primary/20" disabled={loginMutation.isPending}>
              {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("auth.authorizeBtn")}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-4 italic">
              {t("auth.securityNotice")}
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

