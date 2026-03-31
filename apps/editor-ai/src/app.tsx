import EditorAIView from '@components/EditorAIView';
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
            <ShadeApp className="shade-editor-ai app-container" darkMode={designSystem.darkMode} fetchKoenigLexical={null}>
                <EditorAIView />
            </ShadeApp>
        </FrameworkProvider>
    );
};

export default App;
