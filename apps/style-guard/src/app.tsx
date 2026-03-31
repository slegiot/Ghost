import React from 'react';
import StyleGuardView from '@components/StyleGuardView';
import {BaseAppProps, FrameworkProvider} from '@tryghost/admin-x-framework';
import {ShadeApp} from '@tryghost/shade';

const App: React.FC<BaseAppProps> = ({framework, designSystem}) => {
    return (
        <FrameworkProvider {...framework} queryClientOptions={{staleTime: 0, refetchOnMount: true, refetchOnWindowFocus: false}}>
            <ShadeApp className="shade-style-guard app-container" darkMode={designSystem.darkMode} fetchKoenigLexical={null}>
                <StyleGuardView />
            </ShadeApp>
        </FrameworkProvider>
    );
};

export default App;
