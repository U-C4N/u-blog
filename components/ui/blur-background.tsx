interface BlurBackgroundProps {
  isVisible: boolean;
  children: React.ReactNode;
}

export function BlurBackground({ isVisible, children }: BlurBackgroundProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      {children}
    </div>
  );
}