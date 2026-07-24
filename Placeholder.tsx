import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Placeholder({ title }: { title: string }) {
    const { groupId } = useParams();
    const navigate = useNavigate();
    return (
        <div className="p-6">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-4"><ArrowLeft/> Back</button>
            <h1 className="text-xl font-bold">{title}</h1>
            <p>Coming Soon (Group ID: {groupId})</p>
        </div>
    );
}
