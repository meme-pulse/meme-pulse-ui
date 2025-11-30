import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[90vh] bg-background relative overflow-hidden">
      <main className="relative z-10 max-w-screen-2xl mx-auto px-2 sm:px-6 py-8">
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="bg-card mx-auto px-6 py-12 shadow-xl border border-border/50 text-center" style={{ maxWidth: '500px' }}>
            {/* 404 Number */}
            <div className="mb-8">
              <h1 className="text-8xl font-bold text-primary mb-4">404</h1>
              <div className="w-24 h-1 bg-primary mx-auto rounded-full"></div>
            </div>

            {/* Error Message */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Page Not Found</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">The page you're looking for doesn't exist or has been moved.</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate(-1)}
                variant="outline"
                className="flex items-center gap-2 border-border text-foreground hover:bg-muted"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </Button>
              <Button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </div>

            {/* Additional Help */}
            <div className="mt-8 pt-6 border-t border-border/50">
              <p className="text-sm text-muted-foreground">
                Need help? Check our{' '}
                <button onClick={() => navigate('/')} className="text-primary hover:text-primary/80 underline">
                  homepage
                </button>{' '}
                or contact support.
              </p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
