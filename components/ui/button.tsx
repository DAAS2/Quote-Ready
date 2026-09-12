import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_2px_rgb(15_23_42/0.2),0_4px_14px_-6px_rgb(37_64_233/0.45)] hover:-translate-y-px hover:bg-primary/90 hover:shadow-[0_2px_4px_rgb(15_23_42/0.2),0_8px_24px_-6px_rgb(37_64_233/0.55)] active:translate-y-px active:shadow-none dark:bg-primary dark:hover:bg-primary/90",
        outline:
          "border-border bg-background text-foreground shadow-xs hover:-translate-y-px hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary active:translate-y-px dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:-translate-y-px hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_6%)] active:translate-y-px dark:hover:bg-secondary/80",
        ghost:
          "text-foreground hover:bg-muted hover:text-foreground active:bg-muted/70 dark:hover:bg-muted/50",
        destructive:
          "bg-safety/10 text-safety hover:-translate-y-px hover:bg-safety/15 active:translate-y-px dark:bg-safety/20 dark:hover:bg-safety/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs": "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }