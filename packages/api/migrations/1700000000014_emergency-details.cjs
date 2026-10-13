exports.up = pgm => {
 pgm.addColumns('emergency_alerts',{assigned_user_id:{type:'uuid',references:'users',onDelete:'SET NULL'}});
 pgm.createTable('emergency_alert_photos',{
  id:{type:'uuid',primaryKey:true},company_id:{type:'uuid',notNull:true,references:'companies',onDelete:'CASCADE'},
  alert_id:{type:'uuid',notNull:true,references:'emergency_alerts',onDelete:'CASCADE'},
  storage_key:{type:'text',notNull:true,unique:true},filename:{type:'text',notNull:true},content_type:{type:'text',notNull:true},
  created_at:{type:'timestamptz',notNull:true,default:pgm.func('now()')}
 });
 pgm.createIndex('emergency_alert_photos',['company_id','alert_id']);
};
exports.down = pgm => {pgm.dropTable('emergency_alert_photos');pgm.dropColumns('emergency_alerts',['assigned_user_id']);};
