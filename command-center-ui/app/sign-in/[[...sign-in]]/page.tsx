import { SignIn } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SignIn
        appearance={{
          baseTheme: dark,
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-card border border-border shadow-lg rounded-xl',
            headerTitle: 'text-foreground',
            headerSubtitle: 'text-muted-foreground',
            formFieldLabel: 'text-foreground',
            formFieldInput: 'bg-background border-border text-foreground',
            formButtonPrimary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
            footerActionLink: 'text-primary hover:text-primary/80',
            dividerLine: 'bg-border',
            dividerText: 'text-muted-foreground',
            socialButtonsBlockButton: 'bg-card border border-border text-foreground hover:bg-accent',
          }
        }}
        afterSignInUrl="/dashboard"
        signUpUrl="/sign-up"
      />
    </div>
  );
}
