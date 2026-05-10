type StaticClassValue = false | null | string | undefined;
type StatefulClassValue<State> = (state: State) => StaticClassValue;
type ComposedClassName<State> = (state: State) => string;
type ClassValue<State> = StaticClassValue | StatefulClassValue<State>;

export function cn(...classes: StaticClassValue[]): string;
export function cn<State>(...classes: ClassValue<State>[]): string | ComposedClassName<State>;
export function cn<State>(...classes: ClassValue<State>[]): string | ComposedClassName<State> {
  if (classes.some((className) => typeof className === "function")) {
    return (state) =>
      classes
        .map((className) => (typeof className === "function" ? className(state) : className))
        .filter(Boolean)
        .join(" ");
  }

  return classes.filter(Boolean).join(" ");
}
