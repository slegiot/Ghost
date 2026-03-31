import React from 'react';
import SemanticLinkerView from '@components/SemanticLinkerView';
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
            <ShadeApp className="shade-semantic-linker app-container" darkMode={designSystem.darkMode} fetchKoenigLexical={null}>
                <SemanticLinkerView />
            </ShadeApp>
        </FrameworkProvider>
    );
};

export default App;
