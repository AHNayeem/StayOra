/**
 * Root template — wraps every page and remounts on navigation, giving each route
 * a subtle fade-in entrance. It's a Server Component (no client cost); the CSS
 * `animate-fade-in` is neutralized under `prefers-reduced-motion` in globals.css.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
