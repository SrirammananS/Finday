import React from 'react';

const SkeletonDashboard = () => {
    return (
        <div className="px-4 py-8 md:px-6 md:py-16 max-w-4xl mx-auto min-h-screen pb-40 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex justify-between items-end mb-8 md:mb-12">
                <div>
                    <div className="h-3 w-32 bg-card-border/50 rounded mb-2"></div>
                    <div className="h-10 md:h-14 w-48 bg-card-border/50 rounded"></div>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-card-border/50"></div>
            </div>

            {/* Main Balance Card Skeleton */}
            <div className="modern-card p-7 md:p-8 mb-8 md:mb-10 bg-canvas-subtle border-none">
                <div className="h-3 w-24 bg-card-border rounded mb-4"></div>
                <div className="h-12 md:h-16 w-64 bg-card-border rounded mb-8"></div>
                <div className="flex gap-8 border-t border-card-border/30 pt-6">
                    <div>
                        <div className="h-3 w-16 bg-card-border rounded mb-2"></div>
                        <div className="h-6 w-24 bg-card-border rounded"></div>
                    </div>
                    <div>
                        <div className="h-3 w-16 bg-card-border rounded mb-2"></div>
                        <div className="h-6 w-24 bg-card-border rounded"></div>
                    </div>
                </div>
            </div>

            {/* Accounts Ribbon Skeleton */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4 ml-1">
                    <div className="h-3 w-24 bg-card-border/50 rounded"></div>
                    <div className="h-3 w-16 bg-card-border/50 rounded"></div>
                </div>
                <div className="flex gap-4 overflow-x-hidden pb-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex-shrink-0 w-48 p-5 modern-card bg-canvas-subtle border-none h-32 flex flex-col justify-between">
                            <div className="w-8 h-8 rounded-lg bg-card-border/50"></div>
                            <div>
                                <div className="h-3 w-20 bg-card-border/50 rounded mb-2"></div>
                                <div className="h-6 w-32 bg-card-border/50 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Activity Skeleton */}
            <div className="mb-10">
                <div className="flex justify-between items-center mb-6">
                    <div className="h-3 w-32 bg-card-border/50 rounded"></div>
                    <div className="h-3 w-16 bg-card-border/50 rounded"></div>
                </div>

                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="modern-card p-4 flex items-center justify-between bg-canvas-subtle border-none">
                            <div className="flex items-center gap-4 w-full">
                                <div className="w-10 h-10 rounded-xl bg-card-border/50 flex-shrink-0"></div>
                                <div className="space-y-2 w-full max-w-[200px]">
                                    <div className="h-4 w-3/4 bg-card-border/50 rounded"></div>
                                    <div className="h-3 w-1/2 bg-card-border/50 rounded"></div>
                                </div>
                            </div>
                            <div className="h-5 w-20 bg-card-border/50 rounded ml-4"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SkeletonDashboard;
