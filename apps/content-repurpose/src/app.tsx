import ContentRepurposeView from '@components/ContentRepurposeView';
import React from 'react';
import {BaseAppProps, FrameworkProvider} from '@tryghost/admin-x-framework';
import {ShadeApp} from '@tryghost/shade';

const App: React.FC<BaseAppProps> = ({framework, designSystem}) => {
    return (
        <FrameworkProvider {...framework} queryClientOptions={{staleTime: 0, refetchOnMount: true, refetchOnWindowFocus: false}}>
            <ShadeApp className="shade-content-repurpose app-container" darkMode={designSystem.darkMode} fetchKoenigLexical={null}>
                <ContentRepurposeView />
            </ShadeApp>
        </FrameworkProvider>
    );
};

export default App;
