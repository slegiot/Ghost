import AutoTaggerView from '@components/AutoTaggerView';
import React from 'react';
import {BaseAppProps, FrameworkProvider} from '@tryghost/admin-x-framework';
import {ShadeApp} from '@tryghost/shade';

const App: React.FC<BaseAppProps> = ({framework, designSystem}) => {
    return (
        <FrameworkProvider
            {...framework}
            queryClientOptions={{
                staleTime: 0,
                refetchOnMount: true,
                refetchOnWindowFocus: false
            }}
        >
            <ShadeApp className="shade-auto-tagger app-container" darkMode={designSystem.darkMode} fetchKoenigLexical={null}>
                <AutoTaggerView />
            </ShadeApp>
        </FrameworkProvider>
    );
};

export default App;
