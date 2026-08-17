/** Escapes SQL LIKE wildcards in user-supplied search input before parameterized use. */
export function escapeLike(value) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}
