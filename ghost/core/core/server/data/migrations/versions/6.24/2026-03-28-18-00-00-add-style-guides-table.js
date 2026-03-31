const {addTable} = require('../../utils');

module.exports = addTable('style_guides', {
    id: {type: 'string', maxlength: 191, nullable: false, primary: true},
    name: {type: 'string', maxlength: 191, nullable: false},
    tone_keywords: {type: 'text', maxlength: 65535, nullable: true},
    forbidden_phrases: {type: 'text', maxlength: 65535, nullable: true},
    preferred_phrases: {type: 'text', maxlength: 65535, nullable: true},
    min_reading_level: {type: 'string', maxlength: 50, nullable: true},
    max_sentence_length: {type: 'string', maxlength: 50, nullable: true},
    require_active_voice: {type: 'boolean', nullable: false, defaultTo: false},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
});
