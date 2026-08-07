import { Camera, ChevronRight, Compass, MapPin, Plus, Trash2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "wouter";
import type { Photo, Visit } from "@workspace/api-client-react";

export const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", day: "numeric" }).format(new Date(value));
export const imageUrl = (path: string | null | undefined) => path ? (path.startsWith("http") ? path : `/api/storage${path}`) : "";

export function Mark() {
  return <Link href="/" data-testid="link-home" className="flex items-center gap-3 text-sidebar-foreground">
    <span className="grid h-9 w-9 place-items-center rounded-full border border-sidebar-foreground/30 text-sidebar-primary"><Compass size={18} /></span>
    <span><span className="block font-serif text-xl leading-none">Wanderlog</span><span className="font-mono text-[9px] uppercase tracking-[.22em] text-sidebar-foreground/55">a field notebook</span></span>
  </Link>;
}

export function Shell({ children }: { children: ReactNode }) {
  return <div className="grain min-h-[100dvh] bg-background">
    <header className="flex items-center justify-between border-b border-sidebar-border bg-sidebar px-5 py-4 md:hidden"><Mark /><Link href="/visits/new" data-testid="link-new-mobile" className="grid h-9 w-9 place-items-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground"><Plus size={18} /></Link></header>
    <aside className="fixed inset-y-0 left-0 hidden w-[244px] flex-col bg-sidebar px-7 py-8 md:flex"><Mark />
      <nav className="mt-24 space-y-2">
        <p className="mb-5 font-mono text-[10px] uppercase tracking-[.24em] text-sidebar-foreground/40">The notebook</p>
        <Link href="/" data-testid="link-journal" className="flex items-center gap-3 rounded-sm bg-sidebar-accent px-3 py-3 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/80"><span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary" />All entries</Link>
        <Link href="/visits/new" data-testid="link-new-visit" className="flex items-center gap-3 rounded-sm px-3 py-3 text-sm text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"><Plus size={15} />New entry</Link>
      </nav>
      <div className="mt-auto border-t border-sidebar-border pt-5 text-xs leading-relaxed text-sidebar-foreground/45">Keep the small details.<br />They are the ones you return to.</div>
    </aside>
    <main className="min-h-[100dvh] md:ml-[244px]">{children}</main>
  </div>;
}

export function Button({ children, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "quiet" | "danger" }) {
  const styles = variant === "primary" ? "bg-primary text-primary-foreground hover:bg-primary/90" : variant === "danger" ? "border border-destructive/30 text-destructive hover:bg-destructive/10" : "border border-border bg-card text-foreground hover:bg-muted";
  return <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-sm font-medium transition-all active:scale-[.98] disabled:pointer-events-none disabled:opacity-50 ${styles} ${props.className ?? ""}`} />;
}

export function SectionLabel({ children }: { children: ReactNode }) { return <p className="font-mono text-[10px] uppercase tracking-[.24em] text-muted-foreground">{children}</p>; }

export function PhotoTile({ photo, onDelete, index }: { photo: Photo; onDelete?: () => void; index: number }) {
  return <figure className="group relative aspect-square overflow-hidden rounded-sm bg-muted" data-testid={`photo-${photo.id}`}>
    <img src={imageUrl(photo.objectPath)} alt={photo.caption || `Travel photograph ${index + 1}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
    {onDelete && <button onClick={onDelete} data-testid={`button-delete-photo-${photo.id}`} aria-label="Delete photo" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-primary/80 text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100"><Trash2 size={14} /></button>}
    {photo.caption && <figcaption className="absolute inset-x-0 bottom-0 bg-primary/75 px-3 py-2 text-xs text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100">{photo.caption}</figcaption>}
  </figure>;
}

export function VisitCard({ visit, featured = false }: { visit: Visit; featured?: boolean }) {
  return <Link href={`/visits/${visit.id}`} data-testid={`card-visit-${visit.id}`} className={`group relative block overflow-hidden rounded-sm border border-card-border bg-card lift ${featured ? "md:col-span-2 md:row-span-2" : ""}`}>
    <div className={`${featured ? "aspect-[1.28]" : "aspect-[1.36]"} overflow-hidden bg-muted`}>
      {visit.coverPhotoUrl ? <img src={imageUrl(visit.coverPhotoUrl)} alt={visit.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /> : <div className="paper-grid flex h-full items-center justify-center text-primary/25"><Camera size={30} strokeWidth={1} /></div>}
    </div>
    <div className="p-4 md:p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-accent">{visit.country}</p><h3 className={`${featured ? "text-2xl md:text-3xl" : "text-xl"} mt-1 font-serif text-foreground`}>{visit.title}</h3></div><ChevronRight size={17} className="mt-1 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" /></div><p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin size={12} />{visit.location}<span className="mx-1 text-border">·</span>{formatDate(visit.visitDate)}</p></div>
  </Link>;
}

export function ErrorState({ retry }: { retry: () => void }) { return <div className="rounded-sm border border-destructive/25 bg-destructive/5 p-8 text-center"><p className="font-serif text-2xl">The page stayed folded.</p><p className="mt-2 text-sm text-muted-foreground">We couldn't open this part of the notebook.</p><Button variant="quiet" onClick={retry} className="mt-5">Try again</Button></div>; }
export function Skeletons() { return <div className="grid gap-5 md:grid-cols-3"><div className="h-72 animate-pulse rounded-sm bg-muted md:col-span-2" /><div className="h-72 animate-pulse rounded-sm bg-muted" /><div className="h-72 animate-pulse rounded-sm bg-muted" /><div className="h-72 animate-pulse rounded-sm bg-muted" /></div>; }