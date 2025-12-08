"use client"

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usePlacePaperTrade } from '@/hooks/usePortfolio';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const formSchema = z.object({
    symbol: z.string().min(1, 'Symbol is required'),
    action: z.enum(['BUY', 'SELL']),
    quantity: z.coerce.number().int().positive('Quantity must be positive'),
    price: z.coerce.number().positive('Price must be positive'),
    orderType: z.enum(['MKT', 'LMT', 'STP']).default('MKT'),
    notes: z.string().optional(),
});

interface ManualPositionDialogProps {
    onSuccess: () => void;
}

export function ManualPositionDialog({ onSuccess }: ManualPositionDialogProps) {
    const [open, setOpen] = useState(false);

    // Use the hook for placing trades
    const { execute, isSubmitting } = usePlacePaperTrade();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            symbol: '',
            action: 'BUY',
            quantity: 1,
            price: 0,
            orderType: 'MKT',
            notes: '',
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        const trade = await execute({
            symbol: values.symbol.toUpperCase(),
            action: values.action,
            quantity: values.quantity,
            price: values.price,
            orderType: values.orderType,
            notes: values.notes || undefined,
        });

        if (trade) {
            toast.success('Trade Recorded', {
                description: `${values.action} ${values.quantity} ${values.symbol.toUpperCase()} @ $${values.price.toFixed(2)}`,
            });
            setOpen(false);
            form.reset();
            onSuccess();
        } else {
            // Error is handled by the hook but we can show a toast here if we want or rely on hook's error state
            toast.error('Failed to record trade');
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Record Trade
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Record Paper Trade</DialogTitle>
                    <DialogDescription>
                        Record a paper trade to track in your portfolio.
                        This will update your positions and P&L.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="symbol"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Symbol</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="AAPL"
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="action"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Action</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select action" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="BUY">BUY</SelectItem>
                                                <SelectItem value="SELL">SELL</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="orderType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Order Type</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="MKT">Market</SelectItem>
                                                <SelectItem value="LMT">Limit</SelectItem>
                                                <SelectItem value="STP">Stop</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quantity</FormLabel>
                                        <FormControl>
                                            <Input type="number" min="1" step="1" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Price ($)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" min="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes (optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Reason for trade, strategy, etc."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Record Trade
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
