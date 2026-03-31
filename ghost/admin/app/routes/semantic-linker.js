import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default class SemanticLinkerRoute extends AuthenticatedRoute {
    beforeModel() {
        super.beforeModel(...arguments);
        
        // Only allow admins and owners to access the Semantic Linker
        if (this.session.user.isContributor || this.session.user.isAuthor || this.session.user.isEditor) {
            return this.transitionTo('home');
        }
    }
}
