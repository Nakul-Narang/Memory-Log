import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { HomePage, VisitFormPage, VisitPage } from "@/pages/journal-pages";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/visits/new" component={() => <VisitFormPage />} />
      <Route path="/visits/:id/edit" component={() => <VisitFormPage edit />} />
      <Route path="/visits/:id" component={VisitPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
