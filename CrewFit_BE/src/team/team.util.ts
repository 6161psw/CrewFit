interface RoleLike {
  id: number;
  name: string;
  capacity: number;
}
interface MemberLike {
  roleId: number | null;
}

/** 역할별 남은 자리 */
export function computeSlots(roles: RoleLike[], members: MemberLike[]) {
  const slots = roles.map((r) => {
    const filled = members.filter((m) => m.roleId === r.id).length;
    return { id: r.id, name: r.name, capacity: r.capacity, filled, open: Math.max(0, r.capacity - filled) };
  });
  const capacity = Math.max(
    slots.reduce((s, r) => s + r.capacity, 0),
    members.length,
  );
  return { slots, capacity, memberCount: members.length, openCount: slots.reduce((s, r) => s + r.open, 0) };
}

export function roleHasOpenSlot(roles: RoleLike[], members: MemberLike[], roleId: number | null | undefined) {
  if (!roleId) return false;
  return (computeSlots(roles, members).slots.find((s) => s.id === roleId)?.open ?? 0) > 0;
}
