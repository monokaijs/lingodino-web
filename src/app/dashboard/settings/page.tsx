'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
    IconBook,
    IconBuildingFactory,
    IconCheck,
    IconCopy,
    IconDatabase,
    IconExternalLink,
    IconLanguage,
    IconLoader2,
    IconPackage,
    IconRefresh,
    IconVocabulary,
} from '@tabler/icons-react';

interface BuildResult {
    courses: {
        key: string;
        url: string | null;
        size: number;
        count: number;
        lessonsCount: number;
    };
    vocabulary: {
        key: string;
        url: string | null;
        size: number;
        collectionsCount: number;
        itemsCount: number;
    };
    grammar: {
        key: string;
        url: string | null;
        size: number;
        collectionsCount: number;
        itemsCount: number;
    };
    version: string;
    buildTime: string;
}

async function buildProduction(): Promise<BuildResult> {
    const res = await fetch('/api/build-production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
    const json = await res.json();
    if (json.code !== 200) throw new Error(json.message);
    return json.data;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface FileCardProps {
    title: string;
    icon: React.ReactNode;
    fileKey: string;
    url: string | null;
    size: number;
    stats: { label: string; value: number }[];
    color: string;
}

function FileCard({ title, icon, fileKey, url, size, stats, color }: FileCardProps) {
    const [copied, setCopied] = useState(false);

    const handleCopyUrl = async () => {
        if (url) {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success('Đã sao chép URL!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>{icon}</div>
                <div>
                    <h4 className="font-medium">{title}</h4>
                    <p className="text-xs text-muted-foreground">{formatBytes(size)}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {stats.map(stat => (
                    <div key={stat.label} className="text-center rounded bg-muted/50 p-2">
                        <div className="text-lg font-bold">{stat.value}</div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                ))}
            </div>

            <div className="space-y-2">
                <div className="text-xs text-muted-foreground">R2 Key:</div>
                <code className="block font-mono text-xs bg-muted px-2 py-1 rounded truncate">{fileKey}</code>
            </div>

            {url && (
                <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-xs bg-muted px-2 py-1.5 rounded truncate">{url}</code>
                    <Button variant="outline" size="icon-sm" onClick={handleCopyUrl}>
                        {copied ? <IconCheck className="h-3 w-3 text-green-500" /> : <IconCopy className="h-3 w-3" />}
                    </Button>
                    <Button variant="outline" size="icon-sm" asChild>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                            <IconExternalLink className="h-3 w-3" />
                        </a>
                    </Button>
                </div>
            )}
        </div>
    );
}

export default function SettingsPage() {
    const [lastBuild, setLastBuild] = useState<BuildResult | null>(null);

    const buildMutation = useMutation({
        mutationFn: buildProduction,
        onSuccess: data => {
            setLastBuild(data);
            toast.success('Build sản phẩm hoàn tất!');
        },
        onError: (error: Error) => {
            toast.error(`Build thất bại: ${error.message}`);
        },
    });

    return (
        <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
            <div>
                <h1 className="text-2xl font-bold">Cài đặt</h1>
                <p className="text-muted-foreground">Quản lý cấu hình ứng dụng và build sản phẩm</p>
            </div>

            {/* Production Build Section */}
            <Card className="border-2 border-dashed border-primary/20">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <IconBuildingFactory className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Build sản phẩm</CardTitle>
                            <CardDescription>Tạo file dữ liệu để mobile client có thể hoạt động offline</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="rounded-lg bg-muted/50 p-4">
                        <h4 className="font-medium mb-3">Build sẽ tạo các file sau:</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <IconBook className="h-4 w-4 text-blue-500" />
                                <span>
                                    <strong>courses.json</strong> - Khóa học với bài học lồng nhau (bao gồm từ vựng, ngữ pháp, hội thoại)
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <IconDatabase className="h-4 w-4 text-purple-500" />
                                <span>
                                    <strong>vocabulary.sqlite</strong> - Database SQLite chứa tất cả bộ sưu tập và từ vựng
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <IconDatabase className="h-4 w-4 text-orange-500" />
                                <span>
                                    <strong>grammar.sqlite</strong> - Database SQLite chứa tất cả bộ sưu tập và ngữ pháp
                                </span>
                            </div>
                        </div>
                    </div>

                    <Button
                        size="lg"
                        className="w-full"
                        onClick={() => buildMutation.mutate()}
                        disabled={buildMutation.isPending}
                    >
                        {buildMutation.isPending ? (
                            <>
                                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                Đang build...
                            </>
                        ) : (
                            <>
                                <IconPackage className="mr-2 h-4 w-4" />
                                Build & Upload lên R2
                            </>
                        )}
                    </Button>

                    {/* Build Result */}
                    {lastBuild && (
                        <>
                            <Separator />
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <IconCheck className="h-4 w-4 text-green-500" />
                                        Build thành công
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary">v{lastBuild.version}</Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(lastBuild.buildTime).toLocaleString('vi-VN')}
                                        </span>
                                    </div>
                                </div>

                                {/* Files Grid */}
                                <div className="grid gap-4 md:grid-cols-3">
                                    <FileCard
                                        title="Courses JSON"
                                        icon={<IconBook className="h-5 w-5 text-blue-600" />}
                                        fileKey={lastBuild.courses.key}
                                        url={lastBuild.courses.url}
                                        size={lastBuild.courses.size}
                                        color="bg-blue-500/10"
                                        stats={[
                                            { label: 'Khóa học', value: lastBuild.courses.count },
                                            { label: 'Bài học', value: lastBuild.courses.lessonsCount },
                                        ]}
                                    />

                                    <FileCard
                                        title="Vocabulary SQLite"
                                        icon={<IconVocabulary className="h-5 w-5 text-purple-600" />}
                                        fileKey={lastBuild.vocabulary.key}
                                        url={lastBuild.vocabulary.url}
                                        size={lastBuild.vocabulary.size}
                                        color="bg-purple-500/10"
                                        stats={[
                                            { label: 'Bộ sưu tập', value: lastBuild.vocabulary.collectionsCount },
                                            { label: 'Từ vựng', value: lastBuild.vocabulary.itemsCount },
                                        ]}
                                    />

                                    <FileCard
                                        title="Grammar SQLite"
                                        icon={<IconLanguage className="h-5 w-5 text-orange-600" />}
                                        fileKey={lastBuild.grammar.key}
                                        url={lastBuild.grammar.url}
                                        size={lastBuild.grammar.size}
                                        color="bg-orange-500/10"
                                        stats={[
                                            { label: 'Bộ sưu tập', value: lastBuild.grammar.collectionsCount },
                                            { label: 'Ngữ pháp', value: lastBuild.grammar.itemsCount },
                                        ]}
                                    />
                                </div>

                                {!lastBuild.courses.url && (
                                    <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4 text-sm text-yellow-700">
                                        <strong>Lưu ý:</strong> Cấu hình R2_PUBLIC_URL trong biến môi trường để hiển thị URL công khai.
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Rebuild Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <IconRefresh className="h-5 w-5" />
                        Về việc rebuild
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Mỗi lần build sẽ ghi đè các file hiện có tại cùng đường dẫn trên R2. Mobile client chỉ cần lưu URL cố định
                        và sẽ luôn nhận được bản mới nhất khi tải về.
                    </p>
                    <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                        <div className="font-medium">Cấu trúc courses.json:</div>
                        <pre className="text-xs text-muted-foreground overflow-x-auto">
                            {`courses
├── course
│   ├── _id, name, description
│   └── lessons[]
│       ├── _id, name, description, order
│       ├── vocabulary[] (inline items)
│       ├── grammar[] (inline items)
│       └── conversation (inline data)`}
                        </pre>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
