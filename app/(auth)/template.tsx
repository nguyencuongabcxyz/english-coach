/** Re-mounts on every navigation, so each auth screen fades up as it arrives. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter flex w-full min-w-0 flex-1 gap-3">{children}</div>;
}
