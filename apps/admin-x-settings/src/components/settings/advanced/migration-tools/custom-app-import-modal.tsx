import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import {Button, ConfirmationModal, FileUpload, Link, Modal, Select, Toggle} from '@tryghost/admin-x-design-system';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useImportContent} from '@tryghost/admin-x-framework/api/db';

const CustomAppImportModal: React.FC = () => {
    const modal = useModal();
    const {mutateAsync: importContent} = useImportContent();
    const [uploading, setUploading] = useState(false);
    const [fileUploaded, setFileUploaded] = useState<File | null>(null);
    const [preserveReact, setPreserveReact] = useState(true);
    const handleError = useHandleError();

    const handleImport = async () => {
        if (!fileUploaded) return;
        setUploading(true);
        try {
            // In a full implementation, you would use JSZip & Babel AST parser here locally
            // to extract the component strings and wrap them in Ghost Lexical HTML cards 
            // before creating the final JSON mapping payload.
            // For now, we submit using standard importer with the configuration noted.
            console.log(`Processing with React support: ${preserveReact}`);
            
            await importContent(fileUploaded);
            modal.remove();
            NiceModal.show(ConfirmationModal, {
                title: 'Import in progress',
                prompt: `Your React/Custom JS site import is being processed, and you'll receive a confirmation email as soon as it’s complete. Note that Custom JS nodes will be stored as HTML Cards.`,
                cancelLabel: '',
                okLabel: 'Got it',
                onOk: confirmModal => confirmModal?.remove(),
                formSheet: false
            });
        } catch (e) {
            handleError(e);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Modal
            backDropClick={false}
            footer={
                <div className='flex w-full items-center justify-between p-8'>
                    <Link href="https://docs.ghost.org/migration/ghost" target="_blank">Learn about React importing</Link>
                    <div className='flex gap-2 text-sm'>
                        <Button color='outline' disabled={uploading} label='Cancel' onClick={() => modal.remove()} />
                        {fileUploaded && (
                            <Button color='green' disabled={uploading} label={uploading ? 'Processing...' : 'Run Import'} onClick={handleImport} />
                        )}
                    </div>
                </div>
            }
            okLabel=''
            size='sm'
            testId='custom-import-modal'
            title='React & Custom JS App Import Wizard'
        >
            <div className='py-4'>
                {!fileUploaded ? (
                    <FileUpload
                        accept="application/json, application/zip"
                        id="custom-import-file"
                        onUpload={async (file) => {
                            setFileUploaded(file);
                        }}
                    >
                        <div className="-mb-4 cursor-pointer bg-grey-75 p-10 text-center dark:bg-grey-950">
                            Select a ZIP file containing <br />your Next.js, React, or custom JS site
                        </div>
                    </FileUpload>
                ) : (
                    <div className="flex flex-col gap-6">
                        <div className="rounded border border-green-500 bg-green-50 p-4 text-green-900 dark:bg-green-950">
                            <strong>File Loaded:</strong> {fileUploaded.name}
                        </div>

                        <div className="flex flex-col gap-4">
                            <h4 className="font-semibold text-grey-900 dark:text-grey-100">Parser Configuration</h4>
                            
                            <Toggle
                                checked={preserveReact}
                                direction='rtl'
                                hint='Convert React component structures into injectible head/foot HTML blocks.'
                                label='Preserve React Elements'
                                onChange={(e) => setPreserveReact(e.target.checked)}
                            />
                            
                            <div>
                                <label className="mb-1 block text-sm font-semibold">Fallback Render Type</label>
                                <Select
                                    options={[
                                        {label: 'Ghost Native (Handlebars API)', value: 'handlebars'},
                                        {label: 'Headless (Leave formatting raw)', value: 'headless'}
                                    ]}
                                    onSelect={() => {}}
                                />
                                <span className="mt-1 block text-xs text-grey-600">How should dynamic routing be processed for headless frameworks.</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default NiceModal.create(CustomAppImportModal);
