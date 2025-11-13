"use client";

import {cn} from "@/lib/utils/cn"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from "@/components/ui/card"
import {Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator} from "@/components/ui/field"
import {Input} from "@/components/ui/input"
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {registerSchema} from "@/lib/validations/register";
import {registerApi} from "@/app/api/auth/register/register.controller";
import {z} from "zod";
import {toast} from "sonner";

export function RegisterForm({
                               className,
                               ...props
                             }: React.ComponentProps<"div">) {
  const {mutateAsync} = registerApi.useMutation();
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
    },
  });
  const onSubmit = async (data: z.infer<typeof registerSchema>) => {
    try {
      const res = await mutateAsync(data);
      toast.success(res.message);
      form.reset();
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Hello</CardTitle>
          <CardDescription>
            Create an account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="shadcn" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">Submit</Button>
            </form>
          </Form>
          <div className="text-center text-sm text-muted-foreground mt-4">
            Already have an account? <a href="/login">Login</a>
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
