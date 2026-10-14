/** Sort collection entries by their `order` field (file order isn't preserved by the loader). */
export const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;
