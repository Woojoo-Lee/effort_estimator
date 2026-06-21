function readUserId(sessionUser = {}) {
  return (
    sessionUser?.user_id ??
    sessionUser?.userId ??
    sessionUser?.actorUserId ??
    sessionUser?.actor_user_id ??
    null
  );
}

function toIsoString(now = new Date()) {
  if (typeof now === "string") {
    return now;
  }

  return now?.toISOString?.() || new Date().toISOString();
}

export function buildRowHistoryActor(sessionUser) {
  const userId = readUserId(sessionUser);

  if (!userId) {
    return null;
  }

  return {
    user_id: userId,
  };
}

export function buildCreateHistoryFields(sessionUser) {
  const actor = buildRowHistoryActor(sessionUser);

  if (!actor) {
    return {};
  }

  return {
    created_by: actor.user_id,
    updated_by: actor.user_id,
  };
}

export function buildUpdateHistoryFields(sessionUser, now) {
  const actor = buildRowHistoryActor(sessionUser);

  if (!actor) {
    return {};
  }

  return {
    updated_by: actor.user_id,
    updated_at: toIsoString(now),
  };
}

export function mergeCreateHistoryFields(payload = {}, sessionUser) {
  return {
    ...payload,
    ...buildCreateHistoryFields(sessionUser),
  };
}

export function mergeUpdateHistoryFields(payload = {}, sessionUser, now) {
  return {
    ...payload,
    ...buildUpdateHistoryFields(sessionUser, now),
  };
}
