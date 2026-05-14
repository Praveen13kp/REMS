const { ApiError } = require("../../lib/ApiError");
const { logActivity } = require("../activity/activity.service");
const { notify } = require("../notification/notify");

const NOTE_AUTHOR_INCLUDE = {
  user: { select: { id: true, name: true, email: true, image: true } },
};

function shapeNote(note) {
  return {
    id: note.id,
    leadId: note.leadId,
    content: note.content,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    author: note.user
      ? {
          id: note.user.id,
          name: note.user.name,
          email: note.user.email,
          image: note.user.image,
        }
      : null,
  };
}

async function listNotesByLeadService(tenantPrisma, leadId) {
  const lead = await tenantPrisma.lead.findFirst({ where: { id: leadId } });
  if (!lead) throw new ApiError(404, "Lead not found");

  const notes = await tenantPrisma.note.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    include: NOTE_AUTHOR_INCLUDE,
  });

  return notes.map(shapeNote);
}

async function createNoteService(tenantPrisma, data, userId) {
  const lead = await tenantPrisma.lead.findFirst({
    where: { id: data.leadId },
    select: { id: true, name: true, assignedToId: true },
  });
  if (!lead) throw new ApiError(404, "Lead not found");

  const note = await tenantPrisma.note.create({
    data: {
      leadId: data.leadId,
      userId,
      content: data.content,
    },
    include: NOTE_AUTHOR_INCLUDE,
  });

  await logActivity(tenantPrisma, {
    leadId: data.leadId,
    userId,
    type: "NOTE",
    content: "Note added",
    metadata: { noteId: note.id },
  });

  if (lead.assignedToId && lead.assignedToId !== userId) {
    notify(tenantPrisma, {
      userId: lead.assignedToId,
      type: "NOTE_ADDED",
      title: "New note on your lead",
      body: `${note.user?.name ?? "Someone"} added a note on ${lead.name}`,
      link: `/leads/${lead.id}?tab=notes`,
      metadata: { leadId: lead.id, noteId: note.id },
    });
  }

  return shapeNote(note);
}

async function updateNoteService(tenantPrisma, noteId, content, requestingUser) {
  const note = await tenantPrisma.note.findFirst({ where: { id: noteId } });
  if (!note) throw new ApiError(404, "Note not found");

  const isAuthor = note.userId && note.userId === requestingUser.id;
  const isAdmin = requestingUser.role === "OWNER" || requestingUser.role === "ADMIN";
  if (!isAuthor && !isAdmin) {
    throw new ApiError(403, "You can only edit your own notes");
  }

  const updated = await tenantPrisma.note.update({
    where: { id: noteId },
    data: { content },
    include: NOTE_AUTHOR_INCLUDE,
  });

  return shapeNote(updated);
}

async function deleteNoteService(tenantPrisma, noteId, requestingUser) {
  const note = await tenantPrisma.note.findFirst({ where: { id: noteId } });
  if (!note) throw new ApiError(404, "Note not found");

  const isAuthor = note.userId && note.userId === requestingUser.id;
  const isAdmin = requestingUser.role === "OWNER" || requestingUser.role === "ADMIN";
  if (!isAuthor && !isAdmin) {
    throw new ApiError(403, "You can only delete your own notes");
  }

  await tenantPrisma.note.delete({ where: { id: noteId } });
  return { id: noteId };
}

module.exports = {
  listNotesByLeadService,
  createNoteService,
  updateNoteService,
  deleteNoteService,
};
