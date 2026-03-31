import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default class EditorAIRoute extends AuthenticatedRoute {
    beforeModel() {
        super.beforeModel(...arguments);
        if (this.session.user.isContributor || this.session.user.isAuthor || this.session.user.isEditor) {
            return this.transitionTo('home');
        }
    }
}
