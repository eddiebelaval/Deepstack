import { DeepStackLayout } from '@/components/layout/DeepStackLayout';
import { LazyConversationView } from '@/components/lazy';

export default function ChatPage() {
  return (
    <DeepStackLayout>
      <LazyConversationView />
    </DeepStackLayout>
  );
}
