import { dbService } from "@/lib/services/db";
import { notFound } from "next/navigation";
import { UserForm } from "../user-form";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function UserEditPage({ params }: PageProps) {
    const { id } = await params;

    await dbService.connect();
    const user = await dbService.user.findById(id);

    if (!user) {
        notFound();
    }

    // Convert to plain object for client component
    const userObj = {
        _id: user._id.toString(),
        fullName: user.fullName || "",
        email: user.email || "",
        role: user.role,
        photo: user.photo || "",
    };

    return <UserForm user={userObj as any} />;
}
