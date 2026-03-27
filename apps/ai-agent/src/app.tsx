import React from 'react';
import {BaseAppProps, FrameworkProvider} from '@tryghost/admin-x-framework';
import {ShadeApp} from '@tryghost/shade';
import AiAgentView from '@components/AiAgentView';

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
            <ShadeApp className="shade-ai-agent app-container" darkMode={designSystem.darkMode} fetchKoenigLexical={null}>
                <AiAgentView />
            </ShadeApp>
        </FrameworkProvider>
    );
};

export default App;
