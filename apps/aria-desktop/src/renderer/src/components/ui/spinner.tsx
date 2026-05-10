import { cn } from "src/renderer/src/lib/utils";
import { Loader2Icon } from "src/renderer/src/components/DesktopIcon";

type SpinnerProps = Omit<React.ComponentProps<"svg">, "strokeWidth"> & {
  strokeWidth?: number;
};

function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
