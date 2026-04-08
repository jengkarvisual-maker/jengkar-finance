export type ActionResult<T = undefined> = {
  ok: boolean;
  message: string;
  data?: T;
  fieldErrors?: Record<string, string[] | undefined>;
};
