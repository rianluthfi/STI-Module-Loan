/**
  *@NApiVersion 2.x
 */

 //mgp_modul.js

define(['N/query', 'N/task'], function(query, task) {

	function runSchBGProcessStagingData(parameter){
		
		var mySchedule = query.create({
			type: query.Type.SCHEDULED_SCRIPT
		});
		
		var myQueryTask = task.create({
			taskType: task.TaskType.QUERY
		});
		
		myQueryTask.filePath = 'ExportFolder/export.csv';
		
		myQueryTask.query = mySchedule;
		
		
		var scriptTask = task.create({taskType: task.TaskType.SCHEDULED_SCRIPT});
		scriptTask.scriptId = 'customscript_sti_sch_bg_proc_stag_data';
		scriptTask.params = {
			'custscript_sti_param_bg_process': parameter,
		};
		
		myQueryTask.addInboundDependency(scriptTask);
		
		var myTaskId = myQueryTask.submit();
	}
	
	function submitTaskScheduleSingleQueue(parameter){
		
		var mySchedule = query.create({
			type: query.Type.SCHEDULED_SCRIPT
		});
		
		var myQueryTask = task.create({
			taskType: task.TaskType.QUERY
		});
		
		myQueryTask.filePath = 'ExportFolder/export.csv';
		myQueryTask.query = mySchedule;
		
		var scriptTask = task.create({taskType: task.TaskType.SCHEDULED_SCRIPT});
		scriptTask.scriptId = 'customscript_sti_sch_sd_single_process';
		scriptTask.params = {
			'custscript_sti_sch_param_id_sd': parameter
		};
		
		myQueryTask.addInboundDependency(scriptTask);
		var myTaskId = myQueryTask.submit();
		
		var myTaskStatus = task.checkStatus({
			taskId: myTaskId
		});
	}
	
	function runSchReleasedDisbursement(parameter){
		
		var mySchedule = query.create({
			type: query.Type.SCHEDULED_SCRIPT
		});
		
		var myQueryTask = task.create({
			taskType: task.TaskType.QUERY
		});
		
		myQueryTask.filePath = 'ExportFolder/export.csv';
		
		myQueryTask.query = mySchedule;
		
		
		var scriptTask = task.create({taskType: task.TaskType.SCHEDULED_SCRIPT});
		scriptTask.scriptId = 'customscript_sti_sch_released_disburse';
		scriptTask.params = {
			'custscript_sti_id_disbursement': parameter,
		};
		
		myQueryTask.addInboundDependency(scriptTask);
		
		var myTaskId = myQueryTask.submit();
	}

    return {
		runSchBGProcessStagingData : runSchBGProcessStagingData,
		submitTaskScheduleSingleQueue : submitTaskScheduleSingleQueue,
		runSchReleasedDisbursement : runSchReleasedDisbursement
    }
});