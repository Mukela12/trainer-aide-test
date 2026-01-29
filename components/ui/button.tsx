import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-wondrous-primary text-white hover:bg-wondrous-primary-hover active:scale-[0.98] dark:bg-wondrous-magenta dark:hover:bg-wondrous-magenta-alt",
        secondary: "bg-wondrous-blue text-white hover:bg-wondrous-dark-blue active:scale-[0.98] dark:bg-wondrous-dark-blue dark:hover:bg-wondrous-blue",
        destructive: "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] dark:bg-red-700 dark:hover:bg-red-800",
        outline: "border-2 border-wondrous-dark-blue text-wondrous-dark-blue hover:bg-wondrous-dark-blue hover:text-white dark:border-wondrous-blue dark:text-wondrous-blue dark:hover:bg-wondrous-blue dark:hover:text-white",
        ghost: "hover:bg-gray-100 text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700",
        link: "text-wondrous-primary underline-offset-4 hover:underline dark:text-wondrous-magenta",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
