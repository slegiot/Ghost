import PostsAppContextProvider, {PostsAppContextType} from './providers/posts-app-context';
import PostsErrorBoundary from '@components/errors/posts-error-boundary';
import React from 'react';
import {APP_ROUTE_PREFIX, routes} from '@src/routes';
import {BaseAppProps, FrameworkProvider, Outlet, RouterProvider} from '@tryghost/admin-x-framework';
import {ErrorPage, ShadeApp} from '@tryghost/shade';
import {useNavigate} from '@tryghost/admin-x-framework';

interface AppProps extends BaseAppProps {
    fromAnalytics?: boolean;
}

const App: React.FC<AppProps> = ({framework, designSystem, fromAnalytics = false, appSettings}) => {
    const appContextValue: PostsAppContextType = {
        appSettings,
        externalNavigate: (url: string) => {
            window.location.href = url;
        },
        fromAnalytics
    };

    const AppRoutes: React.FC = () => {
        const navigate = useNavigate();

        return (
            <RouterProvider
                prefix={APP_ROUTE_PREFIX}
                routes={routes}
                errorElement={<ErrorPage onBackToDashboard={() => navigate('/', {crossApp: true})} />}
            >
                <PostsErrorBoundary>
                    <ShadeApp className="shade-posts app-container" darkMode={designSystem.darkMode} fetchKoenigLexical={null}>
                        <Outlet />
                    </ShadeApp>
                </PostsErrorBoundary>
            </RouterProvider>
        );
    };

    return (
        <FrameworkProvider
            {...framework}
            queryClientOptions={{
                staleTime: 0, // Always consider data stale (matches Ember admin route behavior)
                refetchOnMount: true, // Always refetch when component mounts (matches Ember route model)
                refetchOnWindowFocus: false // Disable window focus refetch (Ember admin doesn't have this)
            }}
        >
            <PostsAppContextProvider value={appContextValue}>
                <AppRoutes />
            </PostsAppContextProvider>
        </FrameworkProvider>
    );
};

export default App;
