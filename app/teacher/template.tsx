/** Re-mounts on every navigation, so each page's blocks fade up as it arrives. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter flex min-w-0 flex-1 flex-col">{children}</div>;
}
