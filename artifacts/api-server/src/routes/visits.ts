import {
  AddVisitPhotoBody,
  AddVisitPhotoParams,
  AddVisitPhotoResponse,
  CreateVisitBody,
  CreateVisitResponse,
  DeletePhotoParams,
  DeleteVisitParams,
  GetJournalSummaryResponse,
  GetVisitParams,
  GetVisitResponse,
  ListVisitsResponse,
  UpdateVisitBody,
  UpdateVisitParams,
  UpdateVisitResponse,
} from "@workspace/api-zod";
import { db, photosTable, visitsTable } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

type AuthenticatedRequest = Request & { user: { id: string } };

function requireUser(req: Request, res: Response): req is AuthenticatedRequest {
  if (req.isAuthenticated()) return true;
  res.status(401).json({ error: "Please log in to access your journal." });
  return false;
}

function toDateString(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function storageUrl(objectPath: string): string {
  return `/api/storage${objectPath}`;
}

async function getVisitForUser(id: number, userId: string) {
  const [visit] = await db
    .select()
    .from(visitsTable)
    .where(and(eq(visitsTable.id, id), eq(visitsTable.userId, userId)));

  if (!visit) return null;

  const photos = await db
    .select()
    .from(photosTable)
    .where(eq(photosTable.visitId, id))
    .orderBy(desc(photosTable.createdAt));

  const base = {
    ...visit,
    photoCount: photos.length,
    coverPhotoUrl: photos[0] ? storageUrl(photos[0].objectPath) : null,
  };

  return {
    ...base,
    photos,
  };
}

function visitResponse(visit: NonNullable<Awaited<ReturnType<typeof getVisitForUser>>>) {
  return {
    ...visit,
    photos: undefined,
  };
}

router.get("/visits", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;

  const visits = await db
    .select()
    .from(visitsTable)
    .where(eq(visitsTable.userId, req.user.id))
    .orderBy(desc(visitsTable.visitDate), desc(visitsTable.createdAt));

  const hydrated = await Promise.all(
    visits.map(async (visit) => {
      const photos = await db
        .select()
        .from(photosTable)
        .where(eq(photosTable.visitId, visit.id))
        .orderBy(desc(photosTable.createdAt));
      return {
        ...visit,
        photoCount: photos.length,
        coverPhotoUrl: photos[0] ? storageUrl(photos[0].objectPath) : null,
      };
    }),
  );

  res.json(ListVisitsResponse.parse(hydrated));
});

router.post("/visits", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const parsed = CreateVisitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [visit] = await db
    .insert(visitsTable)
    .values({
      userId: req.user.id,
      title: parsed.data.title,
      location: parsed.data.location,
      country: parsed.data.country,
      visitDate: toDateString(parsed.data.visitDate),
      description: parsed.data.description,
      highlights: parsed.data.highlights ?? [],
      travelCompanions: parsed.data.travelCompanions ?? [],
      googlePhotosUrl: parsed.data.googlePhotosUrl ?? null,
    })
    .returning();

  res.status(201).json(
    CreateVisitResponse.parse({
      ...visit,
      photoCount: 0,
      coverPhotoUrl: null,
    }),
  );
});

router.get("/visits/:id", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const params = GetVisitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const visit = await getVisitForUser(params.data.id, req.user.id);
  if (!visit) {
    res.status(404).json({ error: "Visit not found." });
    return;
  }

  res.json(GetVisitResponse.parse(visit));
});

router.patch("/visits/:id", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const params = UpdateVisitParams.safeParse(req.params);
  const parsed = UpdateVisitBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid visit details." });
    return;
  }

  const update = {
    ...parsed.data,
    ...(parsed.data.visitDate
      ? { visitDate: toDateString(parsed.data.visitDate) }
      : {}),
    ...(parsed.data.googlePhotosUrl !== undefined
      ? { googlePhotosUrl: parsed.data.googlePhotosUrl ?? null }
      : {}),
  };

  const [visit] = await db
    .update(visitsTable)
    .set(update)
    .where(and(eq(visitsTable.id, params.data.id), eq(visitsTable.userId, req.user.id)))
    .returning();

  if (!visit) {
    res.status(404).json({ error: "Visit not found." });
    return;
  }

  const photos = await db
    .select()
    .from(photosTable)
    .where(eq(photosTable.visitId, visit.id))
    .orderBy(desc(photosTable.createdAt));
  res.json(
    UpdateVisitResponse.parse({
      ...visit,
      photoCount: photos.length,
      coverPhotoUrl: photos[0] ? storageUrl(photos[0].objectPath) : null,
    }),
  );
});

router.delete("/visits/:id", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const params = DeleteVisitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const deleted = await db
    .delete(visitsTable)
    .where(and(eq(visitsTable.id, params.data.id), eq(visitsTable.userId, req.user.id)))
    .returning({ id: visitsTable.id });

  if (!deleted[0]) {
    res.status(404).json({ error: "Visit not found." });
    return;
  }
  res.sendStatus(204);
});

router.post("/visits/:id/photos", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const params = AddVisitPhotoParams.safeParse(req.params);
  const parsed = AddVisitPhotoBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid photo details." });
    return;
  }

  const visit = await getVisitForUser(params.data.id, req.user.id);
  if (!visit) {
    res.status(404).json({ error: "Visit not found." });
    return;
  }

  const [photo] = await db
    .insert(photosTable)
    .values({
      visitId: params.data.id,
      objectPath: parsed.data.objectPath,
      caption: parsed.data.caption ?? "",
    })
    .returning();
  res.status(201).json(AddVisitPhotoResponse.parse(photo));
});

router.delete("/photos/:id", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const params = DeletePhotoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await db
    .delete(photosTable)
    .where(
      and(
        eq(photosTable.id, params.data.id),
        sql`EXISTS (SELECT 1 FROM visits WHERE visits.id = ${photosTable.visitId} AND visits.user_id = ${req.user.id})`,
      ),
    )
    .returning({ id: photosTable.id });
  if (!result[0]) {
    res.status(404).json({ error: "Photo not found." });
    return;
  }
  res.sendStatus(204);
});

router.get("/journal/summary", async (req, res): Promise<void> => {
  if (!requireUser(req, res)) return;
  const visits = await db
    .select()
    .from(visitsTable)
    .where(eq(visitsTable.userId, req.user.id))
    .orderBy(desc(visitsTable.visitDate), desc(visitsTable.createdAt));

  const photos = await db
    .select({ id: photosTable.id })
    .from(photosTable)
    .innerJoin(visitsTable, eq(photosTable.visitId, visitsTable.id))
    .where(eq(visitsTable.userId, req.user.id));
  const countries = new Set(visits.map((visit) => visit.country));
  const latest = visits[0];
  res.json(
    GetJournalSummaryResponse.parse({
      totalVisits: visits.length,
      totalPhotos: photos.length,
      countriesVisited: countries.size,
      latestVisit: latest
        ? {
            ...latest,
            photoCount: photos.filter((photo) => photo.id === latest.id).length,
            coverPhotoUrl: null,
          }
        : null,
    }),
  );
});

export default router;