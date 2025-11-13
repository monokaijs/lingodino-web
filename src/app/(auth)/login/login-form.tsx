"use client";

import {cn} from "@/lib/utils/cn"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from "@/components/ui/card"
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,} from "@/components/ui/form"
import {Input} from "@/components/ui/input"
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {loginSchema} from "@/lib/validations/login";
import {z} from "zod";
import {signIn} from "next-auth/react";


export function LoginForm({
                            className,
                            ...props
                          }: React.ComponentProps<"div">) {
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
    },
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    signIn("credentials", {
      ...data,
      redirect: false
    }).then((res) => {
      window.location.href = "/dashboard";
    }).finally(() => {
      // form.reset();
    });
  };
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>
            Login with your Apple or Google account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="shadcn" {...field} />
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">Submit</Button>
            </form>
          </Form>
          <div className="text-center text-sm text-muted-foreground mt-4">
            Don't have an account? <a href="/register">Register</a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
