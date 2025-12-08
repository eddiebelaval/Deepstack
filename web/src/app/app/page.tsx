import { DeepStackLayout } from '@/components/layout/DeepStackLayout';
import { ConversationView } from '@/components/chat/ConversationView';

export default function AppPage() {
    return (
        <DeepStackLayout>
            <ConversationView />
        </DeepStackLayout>
    );
}
