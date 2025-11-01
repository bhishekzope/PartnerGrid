import React, { useState } from 'react';
import { Github, LogIn, Key, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';

export function LoginPage() {
  const { login, isLoading, error, setManualToken } = useAuth() as any;
  const [tokenInput, setTokenInput] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [isSubmittingToken, setIsSubmittingToken] = useState(false);

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setIsSubmittingToken(true);
    try {
      await setManualToken(tokenInput.trim());
      setTokenInput('');
    } catch (err) {
      // Error is handled in the context
    } finally {
      setIsSubmittingToken(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Github className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">Welcome to PartnerGrid</CardTitle>
            <CardDescription className="mt-2">
              Sign in with GitHub to find your perfect coding partner
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* OAuth Login Button - Disabled for demo */}
          <div className="space-y-3">
            <Button 
              onClick={login} 
              className="w-full h-12 text-lg"
              disabled={isLoading}
              variant="outline"
            >
              <Github className="mr-2 h-5 w-5" />
              GitHub OAuth (Setup Required)
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              OAuth requires setting up a GitHub OAuth app. Use Personal Access Token below instead.
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Recommended Method
              </span>
            </div>
          </div>

          {/* Manual Token Input - Always show */}
          {!showTokenInput ? (
            <Button 
              variant="default" 
              onClick={() => setShowTokenInput(true)}
              className="w-full"
            >
              <Key className="mr-2 h-4 w-4" />
              Continue with Personal Access Token
            </Button>
          ) : (
            <form onSubmit={handleTokenSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token">GitHub Personal Access Token</Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="ghp_..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  disabled={isSubmittingToken}
                />
                <p className="text-xs text-muted-foreground">
                  Generate a new token at{' '}
                  <a 
                    href="https://github.com/settings/tokens/new?scopes=read:user,user:email&description=DevPartner%20App" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    github.com/settings/tokens/new
                  </a>
                  {' '}with 'read:user' and 'user:email' scopes. 
                  <br />Token should start with 'ghp_' and be 40+ characters long.
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={!tokenInput.trim() || isSubmittingToken}
                  className="flex-1"
                >
                  {isSubmittingToken ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="mr-2 h-4 w-4" />
                  )}
                  {isSubmittingToken ? 'Verifying...' : 'Sign In'}
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => {
                    setShowTokenInput(false);
                    setTokenInput('');
                  }}
                  disabled={isSubmittingToken}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Info about permissions */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-medium">Why do we need GitHub access?</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Access your basic profile information</li>
              <li>• Search for developers using GitHub's API</li>
              <li>• Analyze programming languages and skills</li>
              <li>• Higher rate limits for better performance</li>
            </ul>
          </div>

          {/* OAuth Setup Guide */}
          {/* <div className="bg-blue-50 dark:bg-blue-950/50 rounded-lg p-4 space-y-2 border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">Token Troubleshooting</h4>
            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <div><strong>Invalid token error?</strong></div>
              <ul className="ml-4 space-y-1">
                <li>• Make sure your token starts with 'ghp_'</li>
                <li>• Token should be 40+ characters long</li>
                <li>• Check that 'read:user' and 'user:email' scopes are selected</li>
                <li>• Token might be expired - generate a new one</li>
                <li>• Don't include any extra spaces when copying</li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/50 rounded-lg p-4 space-y-2 border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">Want to enable GitHub OAuth?</h4>
            <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1 ml-4">
              <li>1. Go to GitHub Settings → Developer settings → OAuth Apps</li>
              <li>2. Create a new OAuth App</li>
              <li>3. Set Homepage URL to: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{window.location.origin}</code></li>
              <li>4. Set Authorization callback URL to: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{window.location.origin}/auth/callback</code></li>
              <li>5. Update the CLIENT_ID in AuthContext.tsx and set OAUTH_ENABLED to true</li>
            </ol>
          </div> */}
        </CardContent>
      </Card>
    </div>
  );
}