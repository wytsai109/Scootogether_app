<?php
class Model_admin extends CI_Model{

	public $zone_name = CUSTOM_ZONE_NAME;
	
	// Construct call
	function __construct()
	{
		parent::__construct();
	}

	// Login call
	function login($data)
	{
	 	// grab user input
	
        $username = $data['email'];
        $password = md5($data['password']);
		$remember='';
		if(isset($data['rememberme'])){
        $remember = $data['rememberme'];
		}
        // Prep the query

        // Run the query
        $query = $this->db->query("select * from adminlogin where binary username ='$username' and binary password = '$password'");
        // Let's check if there are any results
	
        if($query->num_rows == 1)
        {
            // If there is a user, then create session data
            //$row = $query->result_array();
			if($remember=='on' && $remember!=''){
			
				$cookie = array(
					'name'   => 'username-admin',
					'value'  => $username,
					'expire' => 86500
				);
				//  $this->ci->db->insert("UserCookies", array("CookieUserEmail"=>$userEmail, "CookieRandom"=>$randomString));
				$this->input->set_cookie($cookie);

				$this->input->cookie('username-admin', false);
			}

         	$this->session->set_userdata('username-admin',$data['email']);
		  	$user = $this->session->userdata('username-admin');
		  
		 	foreach($query->result_array() as $row){
		
		  		$this->session->set_userdata('role-admin',$row['role']);
		 	}
		  	$user1 = $this->session->userdata('role-admin');
		  
		   	$this->db->select('B.rolename as rolename,A.role_id,A.page_id as pages');
			$this->db->from('role B');// I use aliasing make joins easier
			$this->db->join('role_permission A', ' B.r_id = A.role_id');
			$this->db->where('B.rolename',$user1);

			$query1 = $this->db->get();
		  		foreach($query1->result_array() as $row1){
		  			$this->session->set_userdata('permission',$row1['pages']);
		 		}
		 		$user2 = $this->session->userdata('permission');
            	//return $row;
				echo $user1;
		}
        // If the previous process did not validate
        // then return false.
		else
		{
        //return false;
		echo 1;
		}
	}

	// Get user list call
	function getuser($requestData,$flagfilter,$where)
	{
		$columns = array(
			// datatable column index  => database column name
			0 => 'id',
			1 => 'image',
			2 => 'username',
			3 => 'email',
			4 => 'gender',
			5 => 'mobile',
			6 => 'user_status'
		);
		$flag_disp = $flagfilter;
		// getting total number records without any search
		$this->db->select('*');
		if($flag_disp!='' || $flag_disp!=NULL){
			$this->db->where('flag',$flag_disp);
		}
		$totalData=$this->db->get('userdetails')->num_rows();
		$totalFiltered = $totalData;  // when there is no search parameter then total number rows = total number filtered rows.

		$this->db->select('id, image, username, email, gender, mobile, user_status, facebook_id, flag');
		$this->db->from('userdetails');
		if($flag_disp!='' || $flag_disp!=NULL){
			$this->db->where('flag',$flag_disp);
		}
		if ($where !== null) {
			$this->db->where($where);
		}
		if( !empty($requestData['search']['value']) ) {   // if there is a search parameter, $requestData['search']['value'] contains search parameter
			$keywords=$requestData['search']['value'].'%';
			if($flag_disp!='' || $flag_disp!=NULL){
				$this->db->where('flag',$flag_disp);
			}
			//$this->db->where('status','1');
			$this->db->where("(username LIKE '$keywords' OR email LIKE '$keywords' OR gender LIKE '$keywords' OR mobile LIKE '$keywords')");
		}
		$totalFiltered=$this->db->get()->num_rows();
		$this->db->select('id, image, username, email, gender, mobile, user_status, facebook_id, flag');
		$this->db->from('userdetails');
		if($flag_disp!='' || $flag_disp!=NULL){
			$this->db->where('flag',$flag_disp);
		}
		if ($where !== null) {
			$this->db->where($where);
		}
		if( !empty($requestData['search']['value']) ) {   // if there is a search parameter, $requestData['search']['value'] contains search parameter
			$keywords=$requestData['search']['value'].'%';
			if($flag_disp!='' || $flag_disp!=NULL){
				$this->db->where('flag',$flag_disp);
			}
			$this->db->where("(username LIKE '$keywords' OR email LIKE '$keywords' OR gender LIKE '$keywords' OR mobile LIKE '$keywords')");
		}
		//echo $columns[$requestData['order'][0]['column']];
		$this->db->order_by($columns[$requestData['order'][0]['column']],$requestData['order'][0]['dir']);
		$this->db->limit($requestData['length'],$requestData['start']);
		$resultarray=$this->db->get()->result_array();

		$data = array();
		$i=1+$requestData['start'];
		foreach($resultarray as $item)
		{
			// preparing an array
			$nestedData=array();

			$nestedData[] = "<input type='checkbox'  class='deleteRow' value='".$item['id']."'  />" ;
			if($item['image']) {
				$nestedData[] = '<img src=' . base_url() . 'user_image/' . $item["image"] . '>';
			}
			else{
				$nestedData[] = '<img src="' . base_url() . 'upload/no-image-icon.png">';
			}
			$nestedData[] = $item["username"];
			$nestedData[] = $item["email"];
			$nestedData[] = $item["gender"];
			$nestedData[] = $item["mobile"];
			if($item['user_status']=='Active')
			{
				$nestedData[] = '<span class="label label-success"><a href="javascript:void(0)" onclick="status('.$item["id"].')"  style="color: white;">Active</a></span>';
			}
			else
			{
				$nestedData[] = '<span class="label label-default"><a href="javascript:void(0)" onclick="status('.$item["id"].')"  style="color: white;" >Inactive</a></span></span>';
			}
			$nestedData[] = '<!--<a class="table-link" href="javascript:void(0);" onclick="window.location.href=\'view_userdetails?id='.$item['id'].'\'">
				<span class="fa-stack">
					<i class="fa fa-square fa-stack-2x"></i>
					<i class="fa fa-search-plus fa-stack-1x fa-inverse"></i>
				</span>
			</a>-->
			<a onclick="window.location.href=\'view_userdetails?id='.$item['id'].'\'" href="javascript:void(0);" class="table-link">
				<span class="fa-stack">
					<i class="fa fa-square fa-stack-2x"></i>
					<i class="fa fa-search-plus fa-stack-1x fa-inverse"></i>
				</span>
			</a>
            <a data-target="#uidemo-modals-alerts-delete-user" data-toggle="modal" class="table-link danger" href="javascript:void(0);" onclick="delete_single_user('.$item["id"].')">
				<span class="fa-stack">
					<i class="fa fa-square fa-stack-2x"></i>
					<i class="fa fa-trash-o fa-stack-1x fa-inverse"></i>
				</span>
			</a>';

			$data[] = $nestedData;
			$i++;
		}

		$json_data = array(
			"draw"            => intval( $requestData['draw'] ),   // for every request/draw by clientside , they send a number as a parameter, when they recieve a response/data they first check the draw number, so we are sending same number in draw.
			"recordsTotal"    => intval( $totalData ),  // total number of records
			"recordsFiltered" => intval( $totalFiltered ), // total number of records after searching, if there is no searching then totalFiltered = totalData
			"data"            => $data   // total data array
		);

		return json_encode($json_data);  // send data as json format
	}

	// Delete user call
	function deluser($data_ids)
	{
		$data_id_array = explode(",", $data_ids);
		if(!empty($data_id_array)) {
			foreach($data_id_array as $id) {
				$this->db->where('id',$id);
				$this->db->delete('userdetails');
			}
		}
	}

	// Delete single user call
	function delsingleuser($data_id)
	{
		if(!empty($data_id)) {
			$this->db->where('id',$data_id);
			$this->db->delete('userdetails');
		}
	}

	function get_booking_details($id){

		$this->db->select('*');
		$this->db->from('bookingdetails');
		//$this->db->join('bookingdetails', 'driver_details.id = bookingdetails.assigned_for','right');
		$this->db->where('bookingdetails.id',$id);
		$query = $this->db->get();
		$result=$query->row();
		return $result;
	}
	//get explicit selected driver data call
	function get_explicit_selected_drivers($id){
		$this->db->select('*');
		$this->db->from('driver_status');
		$this->db->join('driver_details','driver_details.id=driver_status.driver_id','right');
		$this->db->where('driver_status.booking_id',$id);
		$this->db->order_by('driver_status.start_time');
		$query = $this->db->get()->result_array();
		if($query){
			
			return $query;
		}
		else{
			return false;
			//$query[]=null;
		}
		//return $query;
	}
	// Get car list call
	function get_car_list()
	{
		$this->db->select('*');
		$query=$this->db->get('cabdetails')->result_array();
		return $query;
	}

	// Get driver list call
	function get_driver_list()
	{
		$this->db->select('user_name');
		$query=$this->db->get('driver_details')->result_array();
		return $query;
	}

	// Get booking list call
	function getbooking($requestData,$filterData,$filterBooking,$where)
	{
		$columns = array(
			// datatable column index  => database column name
			0 => 'id',
			1 => 'username',
			2 => 'user_id',
			3 => 'id',
			4 => 'taxi_type',
			5 => 'pickup_area',
			6 => 'drop_area',
			7 => 'pickup_date_time',
			8 => 'status_code'
		);
		$status_disp = $filterData;
		$book_disp = $filterBooking;
		// getting total number records without any search
		$this->db->select('*');
		if($status_disp!='' || $status_disp!=NULL){
			$this->db->where('status',$status_disp);
		}
		else if($book_disp!='' || $book_disp!=NULL){
			$this->db->where('user_id',$book_disp);
		}
		//$status_disp=array('1','2','3','6','7','8');
		//$this->db->where_in('status',$status_disp);
		$totalData=$this->db->get('bookingdetails')->num_rows();
		$totalFiltered = $totalData;  // when there is no search parameter then total number rows = total number filtered rows.

		$this->db->select('username, user_id, id, taxi_type, pickup_area, drop_area, pickup_date_time, status, status_code');
		$this->db->from('bookingdetails');
		if($status_disp!='' || $status_disp!=NULL){
		$this->db->where('status',$status_disp);
		}
		else if($book_disp!='' || $book_disp!=NULL){
			$this->db->where('user_id',$book_disp);
		}
		if ($where !== null) {
			$this->db->where($where);
		}
		if( !empty($requestData['search']['value']) ) {   // if there is a search parameter, $requestData['search']['value'] contains search parameter
			$keywords=$requestData['search']['value'].'%';
			if($status_disp!='' || $status_disp!=NULL){
			$this->db->where('status',$status_disp);
			}
			else if($book_disp!='' || $book_disp!=NULL){
			$this->db->where('user_id',$book_disp);
			}
			//$this->db->where('status','1');
			$this->db->where("(username LIKE '$keywords' OR user_id LIKE '$keywords' OR id LIKE '$keywords' OR taxi_type LIKE '$keywords' OR pickup_area LIKE '$keywords' OR drop_area LIKE '$keywords' OR status_code LIKE '$keywords')");
		}
		$totalFiltered=$this->db->get()->num_rows();
		$this->db->select('username, user_id, id, taxi_type, pickup_area, drop_area, pickup_date_time, status, status_code');
		$this->db->from('bookingdetails');
		if($status_disp!='' || $status_disp!=NULL){
		$this->db->where('status',$status_disp);
		}
		else if($book_disp!='' || $book_disp!=NULL){
			$this->db->where('user_id',$book_disp);
		}
		if ($where !== null) {
			$this->db->where($where);
		}
		if( !empty($requestData['search']['value']) ) {   // if there is a search parameter, $requestData['search']['value'] contains search parameter
			$keywords=$requestData['search']['value'].'%';
			if($status_disp!='' || $status_disp!=NULL){
			$this->db->where('status',$status_disp);
			}
			else if($book_disp!='' || $book_disp!=NULL){
			$this->db->where('user_id',$book_disp);
			}
			//$this->db->where('status','1');
			$this->db->where("(username LIKE '$keywords' OR user_id LIKE '$keywords' OR id LIKE '$keywords' OR taxi_type LIKE '$keywords' OR pickup_area LIKE '$keywords' OR drop_area LIKE '$keywords' OR status_code LIKE '$keywords')");
		}
		//echo $columns[$requestData['order'][0]['column']];
		$this->db->order_by($columns[$requestData['order'][0]['column']],$requestData['order'][0]['dir']);
		$this->db->limit($requestData['length'],$requestData['start']);
		$resultarray=$this->db->get()->result_array();

		$data = array();
		$i=1+$requestData['start'];
		foreach($resultarray as $item)
		{
			// preparing an array
			$nestedData=array();

			$nestedData[] = "<input type='checkbox'  class='deleteRow' value='".$item['id']."'  />" ;
			$nestedData[] = $item["username"];
			$nestedData[] = $item["user_id"];
			$nestedData[] = $item["id"];
			$nestedData[] = $item["taxi_type"];
			$nestedData[] = $item["pickup_area"];
			$nestedData[] = $item["drop_area"];
			$nestedData[] = $item["pickup_date_time"];
			if($item['status_code']=='pending') {
				$nestedData[] = "<span class='label label-default'><a href='#' style='color: white;'>Pending</a></span>";
			}
			else if($item['status_code']=='waiting'){
				$nestedData[] = "<span class='label label-waiting'><a href='#' style='color: white;'>Waiting</a></span>";
			}
			else if($item['status_code']=='accepted'){
				$nestedData[] = "<span class='label label-accepted'><a href='#' style='color: white;'>Accepted</a></span>";
			}
			else if($item['status_code']=='user-cancelled'){
				$nestedData[] = "<span class='label label-user-cancelled'><a href='#' style='color: white;'>User Cancelled</a></span>";
			}
			else if($item['status_code']=='driver-cancelled'){
				$nestedData[] = "<span class='label label-driver-cancelled'><a href='#' style='color: white;'>Driver Cancelled</a></span>";
			}
			else if($item['status_code']=='driver-unavailable'){
				$nestedData[] = "<span class='label label-driver-unavailable'><a href='#' style='color: white;'>Driver Unavailable</a></span>";
			}
			else if($item['status_code']=='driver-arrived'){
				$nestedData[] = "<span class='label label-driver-arrived'><a href='#' style='color: white;'>Driver Arrived</a></span>";
			}
			else if($item['status_code']=='on-trip'){
				$nestedData[] = "<span class='label label-on-trip'><a href='#' style='color: white;'>On Trip</a></span>";
			}
			else if($item['status_code']=='completed'){
				$nestedData[] = "<span class='label label-success'><a href='#' style='color: white;'>Completed</a></span>";
			}
			$nestedData[] = '<!--<a class="table-link" href="javascript:void(0);">
				<span class="fa-stack">
					<i class="fa fa-square fa-stack-2x"></i>
					<i class="fa fa-search-plus fa-stack-1x fa-inverse"></i>
				</span>
			</a>-->
			<a onclick="window.location.href=\'view_booking_details?id='.$item['id'].'\'" href="javascript:void(0);" class="table-link">
				<span class="fa-stack">
					<i class="fa fa-square fa-stack-2x"></i>
					<i class="fa fa-pencil fa-stack-1x fa-inverse"></i>
				</span>
			</a>
            <a data-target="#uidemo-modals-alerts-delete-user" data-toggle="modal" class="table-link danger" href="javascript:void(0);" onclick="delete_single_booking('.$item["id"].')">
				<span class="fa-stack">
					<i class="fa fa-square fa-stack-2x"></i>
					<i class="fa fa-trash-o fa-stack-1x fa-inverse"></i>
				</span>
			</a>';

			$data[] = $nestedData;
			$i++;
		}

		$json_data = array(
			"draw"            => intval( $requestData['draw'] ),   // for every request/draw by clientside , they send a number as a parameter, when they recieve a response/data they first check the draw number, so we are sending same number in draw.
			"recordsTotal"    => intval( $totalData ),  // total number of records
			"recordsFiltered" => intval( $totalFiltered ), // total number of records after searching, if there is no searching then totalFiltered = totalData
			"data"            => $data   // total data array
		);

		return json_encode($json_data);  // send data as json format
	}

	// Get non disp booking list call
	function getnondispbooking($requestData,$where)
	{
		$columns = array(
			// datatable column index  => database column name
			0 => 'id',
			1 => 'username',
			2 => 'user_id',
			3 => 'id',
			4 => 'taxi_type',
			5 => 'pickup_area',
			6 => 'drop_area',
			7 => 'pickup_date_time',
			8 => 'status_code'
		);
		$status_disp=array('1','2','3','7','8');
		// getting total number records without any search
		$this->db->select('*');
		$this->db->where_in('status',$status_disp);
		//$status_disp=array('1','2','3','6','7','8');
		//$this->db->where_in('status',$status_disp);
		$totalData=$this->db->get('bookingdetails')->num_rows();
		$totalFiltered = $totalData;  // when there is no search parameter then total number rows = total number filtered rows.

		$this->db->select('username, user_id, id, taxi_type, pickup_area, drop_area, pickup_date_time, status, status_code');
		$this->db->from('bookingdetails');
		$this->db->where_in('status',$status_disp);
		if ($where !== null) {
			$this->db->where($where);
		}
		if( !empty($requestData['search']['value']) ) {   // if there is a search parameter, $requestData['search']['value'] contains search parameter
			$keywords=$requestData['search']['value'].'%';
			$this->db->where_in('status',$status_disp);
			//$this->db->where('status','1');
			$this->db->where("(username LIKE '$keywords' OR user_id LIKE '$keywords' OR id LIKE '$keywords' OR taxi_type LIKE '$keywords' OR pickup_area LIKE '$keywords' OR drop_area LIKE '$keywords')");
		}
		$totalFiltered=$this->db->get()->num_rows();
		$this->db->select('username, user_id, id, taxi_type, pickup_area, drop_area, pickup_date_time, status, status_code');
		$this->db->from('bookingdetails');
		$this->db->where_in('status',$status_disp);
		if ($where !== null) {
			$this->db->where($where);
		}
		if( !empty($requestData['search']['value']) ) {   // if there is a search parameter, $requestData['search']['value'] contains search parameter
			$keywords=$requestData['search']['value'].'%';
			$this->db->where_in('status',$status_disp);
			//$this->db->where('status','1');
			$this->db->where("(username LIKE '$keywords' OR user_id LIKE '$keywords' OR id LIKE '$keywords' OR taxi_type LIKE '$keywords' OR pickup_area LIKE '$keywords' OR drop_area LIKE '$keywords')");
		}
		//echo $columns[$requestData['order'][0]['column']];
		$this->db->order_by($columns[$requestData['order'][0]['column']],$requestData['order'][0]['dir']);
		$this->db->limit($requestData['length'],$requestData['start']);
		$resultarray=$this->db->get()->result_array();

		$data = array();
		$i=1+$requestData['start'];
		foreach($resultarray as $item)
		{
			// preparing an array
			$nestedData=array();

			$nestedData[] = "<input type='checkbox'  class='deleteRow' value='".$item['id']."'  />" ;
			$nestedData[] = $item["username"];
			$nestedData[] = $item["user_id"];
			$nestedData[] = $item["id"];
			$nestedData[] = $item['taxi_type'];
			$nestedData[] = $item["pickup_area"];
			$nestedData[] = $item["drop_area"];
			$nestedData[] = $item["pickup_date_time"];
			if($item['status_code']=='pending') {
				$nestedData[] = "<span class='label label-default'><a href='#' style='color: white;'>Pending</a></span>";
			}
			else if($item['status_code']=='waiting'){
				$nestedData[] = "<span class='label label-waiting'><a href='#' style='color: white;'>Waiting</a></span>";
			}
			else if($item['status_code']=='accepted'){
				$nestedData[] = "<span class='label label-accepted'><a href='#' style='color: white;'>Accepted</a></span>";
			}
			else if($item['status_code']=='user-cancelled'){
				$nestedData[] = "<span class='label label-user-cancelled'><a href='#' style='color: white;'>User Cancelled</a></span>";
			}
			else if($item['status_code']=='driver-cancelled'){
				$nestedData[] = "<span class='label label-driver-cancelled'><a href='#' style='color: white;'>Driver Cancelled</a></span>";
			}
			else if($item['status_code']=='driver-unavailable'){
				$nestedData[] = "<span class='label label-driver-unavailable'><a href='#' style='color: white;'>Driver Unavailable</a></span>";
			}
			else if($item['status_code']=='driver-arrived'){
				$nestedData[] = "<span class='label label-driver-arrived'><a href='#' style='color: white;'>Driver Arrived</a></span>";
			}
			else if($item['status_code']=='on-trip'){
				$nestedData[] = "<span class='label label-on-trip'><a href='#' style='color: white;'>On Trip</a></span>";
			}
			else if($item['status_code']=='completed'){
				$nestedData[] = "<span class='label label-success'><a href='#' style='color: white;'>Completed</a></span>";
			}
			$nestedData[] = '<!--<a class="table-link" href="javascript:void(0);">
				<span class="fa-stack">
					<i class="fa fa-square fa-stack-2x"></i>
					<i class="fa fa-search-plus fa-stack-1x fa-inverse"></i>
				</span>
			</a>-->
			<a onclick="window.location.href=\'view_booking_details?id='.$item['id'].'\'" href="javascript:void(0);" class="table-link">
				<span class="fa-stack">
					<i class="fa fa-square fa-stack-2x"></i>
					<i class="fa fa-pencil fa-stack-1x fa-inverse"></i>
				</span>
			</a>
            <a data-target="#uidemo-modals-alerts-delete-user" data-toggle="modal" class="table-link danger" href="javascript:void(0);" onclick="delete_single_booking('.$item["id"].')">
				<span class="fa-stack">
					<i class="fa fa-square fa-stack-2x"></i>
					<i class="fa fa-trash-o fa-stack-1x fa-inverse"></i>
				</span>
			</a>';

			$data[] = $nestedData;
			$i++;
		}

		$json_data = array(
			"draw"            => intval( $requestData['draw'] ),   // for every request/draw by clientside , they send a number as a parameter, when they recieve a response/data they first check the draw number, so we are sending same number in draw.
			"recordsTotal"    => intval( $totalData ),  // total number of records
			"recordsFiltered" => intval( $totalFiltered ), // total number of records after searching, if there is no searching then totalFiltered = totalData
			"data"            => $data   // total data array
		);

		return json_encode($json_data);  // send data as json format
	}

	// update driver details call
	function updatebooking($id,$data_id,$taxi_type,$amount)
	{
		//$zone_name = 'Asia/Calcutta';
		$date = new DateTime("now", new DateTimeZone($this->zone_name));
		$startTime = $date->format('Y-m-d H:i:s');
		$date = new DateTime("now", new DateTimeZone($this->zone_name));
		$date->add(new DateInterval('PT60S'));
		//$endTime = date('Y-m-d H:i:s',strtotime('+60 seconds',strtotime($startTime)));
		$endTime = $date->format('Y-m-d H:i:s');
		if($taxi_type!='' && $taxi_type!=null)
		{
			$booking_update=array(
				'taxi_type' => $taxi_type,
				'amount'	=> $amount
				);
			$this->db->where('id',$id);
			$update=$this->db->update('bookingdetails',$booking_update);
		}
		if($data_id!='' && $data_id!=null){
			$data=array(
				'driver_id' => $data_id,
				'booking_id' => $id,
				'start_time' => $startTime,
				'end_time' => $endTime
			);
			$insert=$this->db->insert('driver_status',$data);
		}
		if($insert){
			echo 1;
		}
		else{
			echo 0;
		}
		

	}
	
	// Delete booking call
	function deletemultibooking($data){
		//$id = $data['id'];
		$this->db->where_in('id', $data);
		if($this->db->delete('bookingdetails'))
		{
			print_r($data);
		}
		else{
			print_r($data);
		}
	}

	// Delete booking call
	function delbooking($data_ids)
	{
		$data_id_array = explode(",", $data_ids);
		if(!empty($data_id_array)) {
			foreach($data_id_array as $id) {
				$this->db->where('id',$id);
				$this->db->delete('bookingdetails');
			}
		}
	}

	// Delete single booking call
	function delsinglebooking($data_id)
	{
		if (!empty($data_id)) {
			$this->db->where('id', $data_id);
			$this->db->delete('bookingdetails');
		}
	}

	// Get driver list call
	function getdriver($requestData,$flagfilter,$where)
	{
		$columns = array(
			// datatable column index  => database column name
			0 => 'id',
			1 => 'image',
			2 => 'name',
			3 => 'phone',
			4 => 'address',
			5 => 'license_no',
			6 => 'car_type',
			7 => 'car_no',
			8 => 'socket_status',
			9 => 'status'
		);

		$flag_disp = $flagfilter;
		// getting total number records without any search
		$this->db->select('*');
		if($flag_disp!='' || $flag_disp!=NULL){
			$this->db->where('flag',$flag_disp);
		}
		$totalData=$this->db->get('driver_details')->num_rows();
		$totalFiltered = $totalData;  // when there is no search parameter then total number rows = total number filtered rows.

		$this->db->select('id, image, name, phone, address, license_no,car_type,car_no,socket_status,status,flag');
		$this->db->from('driver_details');
		$this->db->join('cabdetails','cabdetails.cab_id=driver_details.car_type');
		if($flag_disp!='' || $flag_disp!=NULL){
			$this->db->where('flag',$flag_disp);
		}
		if ($where !== null) {
			$this->db->where($where);
		}
		if( !empty($requestData['search']['value']) ) {   // if there is a search parameter, $requestData['search']['value'] contains search parameter
			$keywords=$requestData['search']['value'].'%';
			if($flag_disp!='' || $flag_disp!=NULL){
				$this->db->where('flag',$flag_disp);
			}
			//$this->db->where('status','1');
			$this->db->where("(name LIKE '$keywords' OR phone LIKE '$keywords' OR address LIKE '$keywords' OR license_no LIKE '$keywords' OR cabdetails.cartype LIKE '$keywords' OR car_no LIKE '$keywords')");
		}
		$totalFiltered=$this->db->get()->num_rows();
		$this->db->select('id, image, name, phone, address, license_no,car_type,car_no,socket_status,status,flag');
		$this->db->from('driver_details');
		$this->db->join('cabdetails','cabdetails.cab_id=driver_details.car_type');
		if($flag_disp!='' || $flag_disp!=NULL){
			$this->db->where('flag',$flag_disp);
		}
		if ($where !== null) {
			$this->db->where($where);
		}
		if( !empty($requestData['search']['value']) ) {   // if there is a search parameter, $requestData['search']['value'] contains search parameter
			$keywords=$requestData['search']['value'].'%';
			if($flag_disp!='' || $flag_disp!=NULL){
				$this->db->where('flag',$flag_disp);
			}
			$this->db->where("(name LIKE '$keywords' OR phone LIKE '$keywords' OR address LIKE '$keywords' OR license_no LIKE '$keywords' OR cabdetails.cartype LIKE '$keywords' OR car_no LIKE '$keywords')");
		}
		//echo $columns[$requestData['order'][0]['column']];
		$this->db->order_by($columns[$requestData['order'][0]['column']],$requestData['order'][0]['dir']);
		$this->db->limit($requestData['length'],$requestData['start']);
		$resultarray=$this->db->get()->result_array();

		$data = array();
		$i=1+$requestData['start'];
		foreach($resultarray as $item)
		{
			// preparing an array
			$nestedData=array();

			$nestedData[] = "<input type='checkbox'  class='deleteRow' value='".$item['id']."'  />" ;
			if($item['image']) {
				$nestedData[] = '<img src=' . base_url() . 'driverimages/'. $item["image"] . '>';
			}
			else{
				$nestedData[] = '<img src="' . base_url() . 'upload/no-image-icon.png">';
			}
			$nestedData[] = $item["name"];
			$nestedData[] = $item["phone"];
			$nestedData[] = $item["address"];
			$nestedData[] = $item["license_no"];
			if($item['car_type'])
			{
				$this->db->where('cab_id',$item['car_type']);
				$getcartype=$this->db->get('cabdetails')->row();
			}
			$nestedData[] = $getcartype->cartype;
			$nestedData[] = $item["car_no"];
			if($item['socket_status']=='Active')
			{
				$nestedData[] = '<span class="label label-success"><a href="javascript:void(0)" style="color: white;">Online</a></span>';
			}
			else
			{
				$nestedData[] = '<span class="label label-default"><a href="javascript:void(0)" style="color: white;">Offline</a></span></span>';
			}
			if($item['status']=='Active')
			{
				$nestedData[] = '<span class="label label-success"><a href="javascript:void(0)" onclick="driverstatus('.$item["id"].')"  style="color: white;">Active</a></span>';
			}
			else
			{
				$nestedData[] = '<span class="label label-default"><a href="javascript:void(0)" onclick="driverstatus('.$item["id"].')"  style="color: white;">Inactive</a></span></span>';
			}
			$nestedData[] = '<a class="table-link" href="javascript:void(0);" onclick="window.location.href=\'view_driver_details?id='.$item['id'].'\'">
				<span class="fa-stack">
					<i class="fa fa-square fa-stack-2x"></i>
					<i class="fa fa-search-plus fa-stack-1x fa-inverse"></i>
				</span>
			</a>

            <a data-target="#uidemo-modals-alerts-delete-user" data-toggle="modal" class="table-link danger" href="javascript:void(0);" onclick="delete_single_user('.$item["id"].')">
				<span class="fa-stack">
					<i class="fa fa-square fa-stack-2x"></i>
					<i class="fa fa-trash-o fa-stack-1x fa-inverse"></i>
				</span>
			</a>';

			$data[] = $nestedData;
			$i++;
		}

		$json_data = array(
			"draw"            => intval( $requestData['draw'] ),   // for every request/draw by clientside , they send a number as a parameter, when they recieve a response/data they first check the draw number, so we are sending same number in draw.
			"recordsTotal"    => intval( $totalData ),  // total number of records
			"recordsFiltered" => intval( $totalFiltered ), // total number of records after searching, if there is no searching then totalFiltered = totalData
			"data"            => $data   // total data array
		);

		return json_encode($json_data);  // send data as json format
	}

	// Get select driver list call
	function getselectdriver($requestData,$booking_id,$where)
	{
		$columns = array(
			// datatable column index  => database column name
			0 => 'id',
			1 => 'id',
			2 => 'name',
			3 => 'phone',
			4 => 'license_no',
			5 => 'car_type',
			6 => 'car_no',
			7 => 'status'
		);

		$this->db->select('*');
		$this->db->from('driver_status');
		$this->db->where('booking_id',$booking_id);
		$this->db->or_where('driver_flag','0');
		$this->db->or_where('driver_flag','1');
		$driver_list=$this->db->get()->result_array();
		if($driver_list){
			foreach($driver_list as $dl){
				$filterData[]=$dl['driver_id'];
			}
		}
		else{
			$filterData[]='';
		}
		// getting total number records without any search
		$this->db->select('*');
		$this->db->where('status','Active');
		$this->db->where('socket_status','Active');
		$this->db->where_not_in('id',$filterData);
		$totalData=$this->db->get('driver_details')->num_rows();
		$totalFiltered = $totalData;  // when there is no search parameter then total number rows = total number filtered rows.

		$this->db->select('id,name,phone,license_no,car_type,car_no,status');
		$this->db->from('driver_details');
		$this->db->join('cabdetails','cabdetails.cab_id=driver_details.car_type');
		$this->db->where('status','Active');
		$this->db->where('socket_status','Active');
		$this->db->where_not_in('id',$filterData);
		if ($where !== null) {
			$this->db->where($where);
		}
		if(!empty($requestData['search']['value']) ) {   // if there is a search parameter, $requestData['search']['value'] contains search parameter
			$keywords=$requestData['search']['value'].'%';
			$this->db->where('status','Active');
			$this->db->where('socket_status','Active');
			$this->db->where_not_in('id',$filterData);
			$this->db->where("(id LIKE '$keywords' OR name LIKE '$keywords' OR phone LIKE '$keywords' OR license_no LIKE '$keywords' OR cabdetails.cartype LIKE '$keywords' OR car_no LIKE '$keywords')");
		}
		$totalFiltered=$this->db->get()->num_rows();
		$this->db->select('id,name,phone,license_no,car_type,car_no,status');
		$this->db->from('driver_details');
		$this->db->join('cabdetails','cabdetails.cab_id=driver_details.car_type');
		$this->db->where('status','Active');
		$this->db->where('socket_status','Active');
		$this->db->where_not_in('id',$filterData);
		if ($where !== null) {
			$this->db->where($where);
		}
		if(!empty($requestData['search']['value']) ) {   // if there is a search parameter, $requestData['search']['value'] contains search parameter
			$keywords=$requestData['search']['value'].'%';
			$this->db->where('status','Active');
			$this->db->where('socket_status','Active');
			$this->db->where_not_in('id',$filterData);
			$this->db->where("(id LIKE '$keywords' OR name LIKE '$keywords' OR phone LIKE '$keywords' OR license_no LIKE '$keywords' OR cabdetails.cartype LIKE '$keywords' OR car_no LIKE '$keywords')");
		}
		//echo $columns[$requestData['order'][0]['column']];
		$this->db->order_by($columns[$requestData['order'][0]['column']],$requestData['order'][0]['dir']);
		$this->db->limit($requestData['length'],$requestData['start']);
		$resultarray=$this->db->get()->result_array();

		$data = array();
		$i=1+$requestData['start'];
		foreach($resultarray as $item)
		{
			// preparing an array
			$nestedData=array();

			$nestedData[] = "" ;
			$nestedData[] = $item["id"];
			$nestedData[] = $item["name"];
			$nestedData[] = $item["phone"];
			$nestedData[] = $item["license_no"];
			if($item['car_type'])
			{
				$this->db->where('cab_id',$item['car_type']);
				$getcartype=$this->db->get('cabdetails')->row();
				$nestedData[]=$getcartype->cartype;
			}
			$nestedData[] = $item["car_no"];
			if($item['status']=='Active')
			{
				$nestedData[] = '<span class="label label-success"><a onclick="driverstatus('.$item["id"].')"  style="color: white;">Active</a></span>';
			}
			else
			{
				$nestedData[] = '<span class="label label-default"><a onclick="driverstatus('.$item["id"].')"  style="color: white;">Inactive</a></span></span>';
			}
			$data[] = $nestedData;
			$i++;
		}

		$json_data = array(
			"draw"            => intval( $requestData['draw'] ),   // for every request/draw by clientside , they send a number as a parameter, when they recieve a response/data they first check the draw number, so we are sending same number in draw.
			"recordsTotal"    => intval( $totalData ),  // total number of records
			"recordsFiltered" => intval( $totalFiltered ), // total number of records after searching, if there is no searching then totalFiltered = totalData
			"data"            => $data   // total data array
		);

		return json_encode($json_data);  // send data as json format
	}

	// Delete driver call
	function deldriver($data_ids)
	{
		$data_id_array = explode(",", $data_ids);
		if(!empty($data_id_array)) {
			foreach($data_id_array as $id) {
				$this->db->where('id',$id);
				$this->db->delete('driver_details');
			}
		}
	}

	// Delete single driver call
	function delsingledriver($data_id)
	{
		if(!empty($data_id)) {
			$this->db->where('id',$data_id);
			$this->db->delete('driver_details');
		}
	}

	// get car type data call
	function getcartypedata($cab_id)
	{
		$this->db->select('*');
		$this->db->where('cab_id',$cab_id);
		$result=$this->db->get('cabdetails')->row();
		if($result){
			return $result;
		}
		else{
			return false;
		}
	}
	
	// Insert car data call
	function insertcardata($data)
	{
		$insert=$this->db->insert('cabdetails',$data);
		if($insert){
			return $data;
		}
		else{
			return false;
		}
	}

	// Check email and username call
	function checkemailusername($email,$username)
	{
		$this->db->where('email',$email);
		$this->db->or_where('user_name',$username);
		$result=$this->db->get('driver_details')->result_array();
		if($result)
		{
			return $result;
		}
		else{
			return 0;
		}
	}
	// Insert driver data call
	function insertdriverdata($data)
	{
		$insert=$this->db->insert('driver_details',$data);
		if($insert){
			return $data;
		}
		else{
			return false;
		}
	}

	// Get car list call
	function getcar($requestData,$where)
	{
		$columns = array(
			// datatable column index  => database column name
			0 => 'cab_id',
			1 => 'cartype',
			2 => 'icon',
			3 => 'car_rate',
			4 => 'seat_capacity'

		);

		// getting total number records without any search
		$this->db->select('*');
		$totalData=$this->db->get('cabdetails')->num_rows();
		$totalFiltered = $totalData;  // when there is no search parameter then total number rows = total number filtered rows.

		$this->db->select('cab_id,cartype, icon, car_rate, seat_capacity');
		$this->db->from('cabdetails');
		if ($where !== null) {
			$this->db->where($where);
		}
		if( !empty($requestData['search']['value']) ) {   // if there is a search parameter, $requestData['search']['value'] contains search parameter
			$this->db->like('cartype',$requestData['search']['value'],'after');
			$this->db->or_like('icon',$requestData['search']['value'],'after');
			$this->db->or_like('car_rate',$requestData['search']['value'],'after');
			$this->db->or_like('seat_capacity',$requestData['search']['value'],'after');
		}
		//$totalFiltered=$this->db->get()->num_rows();
		//echo $columns[$requestData['order'][0]['column']];
		$this->db->order_by($columns[$requestData['order'][0]['column']],$requestData['order'][0]['dir']);
		$this->db->limit($requestData['length'],$requestData['start']);
		$resultarray=$this->db->get()->result_array();

		$data = array();
		$i=1+$requestData['start'];
		foreach($resultarray as $item)
		{
			// preparing an array
			$nestedData=array();

			$nestedData[] = "<input type='checkbox'  class='deleteRow' value='".$item['cab_id']."'  />" ;
			$nestedData[] = '<img src='.base_url().'car_image/'.$item["icon"].'>';
			$nestedData[] = $item["cartype"];
			$nestedData[] = $item["car_rate"];
			$nestedData[] = $item["seat_capacity"];

			$nestedData[] = '

			<a onclick="window.location.href=\'view_cartype_details?id='.$item['cab_id'].'\'" href="javascript:void(0);" class="table-link">
				<span class="fa-stack">
					<i class="fa fa-square fa-stack-2x"></i>
					<i class="fa fa-pencil fa-stack-1x fa-inverse"></i>
				</span>
			</a>
            <a data-target="#uidemo-modals-alerts-delete-user" data-toggle="modal" class="table-link danger" href="javascript:void(0);" onclick="delete_single_user('.$item["cab_id"].')">
				<span class="fa-stack">
					<i class="fa fa-square fa-stack-2x"></i>
					<i class="fa fa-trash-o fa-stack-1x fa-inverse"></i>
				</span>
			</a>';

			$data[] = $nestedData;
			$i++;
		}

		$json_data = array(
			"draw"            => intval( $requestData['draw'] ),   // for every request/draw by clientside , they send a number as a parameter, when they recieve a response/data they first check the draw number, so we are sending same number in draw.
			"recordsTotal"    => intval( $totalData ),  // total number of records
			"recordsFiltered" => intval( $totalFiltered ), // total number of records after searching, if there is no searching then totalFiltered = totalData
			"data"            => $data   // total data array
		);

		return json_encode($json_data);  // send data as json format
	}

	// Delete car call
	function delcar($data_ids)
	{
		$data_id_array = explode(",", $data_ids);
		if(!empty($data_id_array)) {
			foreach($data_id_array as $id) {
				$this->db->where('cab_id',$id);
				$this->db->delete('cabdetails');
			}
		}
	}

	// Delete single car call
	function delsinglecar($data_id)
	{
		if(!empty($data_id)) {
			$this->db->where('cab_id',$data_id);
			$this->db->delete('cabdetails');
		}
	}

	// Get time type list call
	function gettimetype($requestData,$where)
	{
		$columns = array(
			// datatable column index  => database column name
			0 => 'tid',
			1 => 'day_start_time',
			2 => 'day_end_time'
		);

		// getting total number records without any search
		$this->db->select('*');
		$totalData=$this->db->get('time_detail')->num_rows();
		$totalFiltered = $totalData;  // when there is no search parameter then total number rows = total number filtered rows.

		$this->db->select('tid, day_start_time, day_end_time');
		$this->db->from('time_detail');
		if ($where !== null) {
			$this->db->where($where);
		}
		if( !empty($requestData['search']['value']) ) {   // if there is a search parameter, $requestData['search']['value'] contains search parameter
			$this->db->like('day_start_time',$requestData['search']['value'],'after');
			$this->db->or_like('day_end_time',$requestData['search']['value'],'after');
		}
		$totalFiltered=$this->db->get()->num_rows();
		$this->db->select('tid, day_start_time, day_end_time');
		$this->db->from('time_detail');
		if ($where !== null) {
			$this->db->where($where);
		}
		if( !empty($requestData['search']['value']) ) {   // if there is a search parameter, $requestData['search']['value'] contains search parameter
			$this->db->like('day_start_time',$requestData['search']['value'],'after');
			$this->db->or_like('day_end_time',$requestData['search']['value'],'after');
		}
		//echo $columns[$requestData['order'][0]['column']];
		$this->db->order_by($columns[$requestData['order'][0]['column']],$requestData['order'][0]['dir']);
		$this->db->limit($requestData['length'],$requestData['start']);
		$resultarray=$this->db->get()->result_array();

		$data = array();
		$i=1+$requestData['start'];
		foreach($resultarray as $item)
		{
			// preparing an array
			$nestedData=array();

			$nestedData[] = "<input type='checkbox'  class='deleteRow' value='".$item['tid']."'  />" ;
			$nestedData[] = $item["day_start_time"];
			$nestedData[] = $item["day_end_time"];

			$nestedData[] = '<a onclick="window.location.href=\'edit_time_type?tid='.$item['tid'].'\'" href="javascript:void(0);" class="table-link">
				<span class="fa-stack">
					<i class="fa fa-square fa-stack-2x"></i>
					<i class="fa fa-pencil fa-stack-1x fa-inverse"></i>
				</span>
			</a>';

			$data[] = $nestedData;
			$i++;
		}

		$json_data = array(
			"draw"            => intval( $requestData['draw'] ),   // for every request/draw by clientside , they send a number as a parameter, when they recieve a response/data they first check the draw number, so we are sending same number in draw.
			"recordsTotal"    => intval( $totalData ),  // total number of records
			"recordsFiltered" => intval( $totalFiltered ), // total number of records after searching, if there is no searching then totalFiltered = totalData
			"data"            => $data   // total data array
		);

		return json_encode($json_data);  // send data as json format
	}

	// Get reasons list call
	function getreasons($requestData,$where)
	{
		$columns = array(
			// datatable column index  => database column name
			0 => 'reason_id',
			1 => 'reason_id',
			2 => 'reason_title',
			3 => 'reason_text'
		);

		// getting total number records without any search
		$this->db->select('*');
		$totalData=$this->db->get('delay_reasons')->num_rows();
		$totalFiltered = $totalData;  // when there is no search parameter then total number rows = total number filtered rows.

		$this->db->select('reason_id, reason_title, reason_text');
		$this->db->from('delay_reasons');
		if ($where !== null) {
			$this->db->where($where);
		}
		if( !empty($requestData['search']['value']) ) {   // if there is a search parameter, $requestData['search']['value'] contains search parameter
			$this->db->like('reason_id',$requestData['search']['value'],'after');
			$this->db->or_like('reason_title',$requestData['search']['value'],'after');
			$this->db->or_like('reason_text',$requestData['search']['value'],'after');
		}
		$totalFiltered=$this->db->get()->num_rows();
		$this->db->select('reason_id, reason_title, reason_text');
		$this->db->from('delay_reasons');
		if ($where !== null) {
			$this->db->where($where);
		}
		if( !empty($requestData['search']['value']) ) {   // if there is a search parameter, $requestData['search']['value'] contains search parameter
			$this->db->like('reason_id',$requestData['search']['value'],'after');
			$this->db->or_like('reason_title',$requestData['search']['value'],'after');
			$this->db->or_like('reason_text',$requestData['search']['value'],'after');
		}
		//echo $columns[$requestData['order'][0]['column']];
		$this->db->order_by($columns[$requestData['order'][0]['column']],$requestData['order'][0]['dir']);
		$this->db->limit($requestData['length'],$requestData['start']);
		$resultarray=$this->db->get()->result_array();

		$data = array();
		$i=1+$requestData['start'];
		foreach($resultarray as $item)
		{
			// preparing an array
			$nestedData=array();

			$nestedData[] = "<input type='checkbox'  class='deleteRow' value='".$item['reason_id']."'  />" ;
			$nestedData[] = $item["reason_id"];
			$nestedData[] = $item["reason_title"];
			$nestedData[] = $item["reason_text"];

			$nestedData[] = '

			<a onclick="window.location.href=\'view_delayreason_details?id='.$item['reason_id'].'\'" href="javascript:void(0);" class="table-link">
				<span class="fa-stack">
					<i class="fa fa-square fa-stack-2x"></i>
					<i class="fa fa-pencil fa-stack-1x fa-inverse"></i>
				</span>
			</a>
            <a data-target="#uidemo-modals-alerts-delete-user" data-toggle="modal" class="table-link danger" href="javascript:void(0);" onclick="delete_single_reason('.$item["reason_id"].')">
				<span class="fa-stack">
					<i class="fa fa-square fa-stack-2x"></i>
					<i class="fa fa-trash-o fa-stack-1x fa-inverse"></i>
				</span>
			</a>';

			$data[] = $nestedData;
			$i++;
		}

		$json_data = array(
			"draw"            => intval( $requestData['draw'] ),   // for every request/draw by clientside , they send a number as a parameter, when they recieve a response/data they first check the draw number, so we are sending same number in draw.
			"recordsTotal"    => intval( $totalData ),  // total number of records
			"recordsFiltered" => intval( $totalFiltered ), // total number of records after searching, if there is no searching then totalFiltered = totalData
			"data"            => $data   // total data array
		);

		return json_encode($json_data);  // send data as json format
	}

	// Delete reason call
	function delres($data_ids)
	{
		$data_id_array = explode(",", $data_ids);
		if(!empty($data_id_array)) {
			foreach($data_id_array as $id) {
				$this->db->where('reason_id',$id);
				$this->db->delete('delay_reasons');
			}
		}
	}

	// Delete single reason call
	function delsingleres($data_id)
	{
		if(!empty($data_id)) {
			$this->db->where('reason_id',$data_id);
			$this->db->delete('delay_reasons');
		}
	}

	// getbookingcount
	function getbookingidcount($booking_id)
	{
		$this->db->select('*');
		$this->db->where('booking_id',$booking_id);
		$query = $this->db->get('driver_status');
		$num = $query->num_rows();
		return $num;
	}
	// update driver status table call
	function updatedriverstatus($booking_id,$driver_id)
	{
		//$zone_name = 'Asia/Calcutta';
		$date = new DateTime("now", new DateTimeZone($this->zone_name));
		$startTime = $date->format('Y-m-d H:i:s');
		$date = new DateTime("now", new DateTimeZone($this->zone_name));
		$date->add(new DateInterval('PT60S'));
		//$endTime = date('Y-m-d H:i:s',strtotime('+60 seconds',strtotime($startTime)));
		$endTime = $date->format('Y-m-d H:i:s');
		$data=array(
			'driver_id' => $driver_id,
			'booking_id' => $booking_id,
			'start_time' => $startTime,
			'end_time' => $endTime
		);
		$insert=$this->db->insert('driver_status',$data);
			if($insert){
			return $data;
		}
		else{
			return false;
		}
	}

	// update driver flag call
	function updatedriverflag($booking_id)
	{
		$data=array(
			'status_code' => 'driver-unavailable',
			'status'	=> 6
		);
		$this->db->where('id',$booking_id);
		$this->db->update('bookingdetails',$data);
	}
	

	// update user status call
	function statususer($data_id)
	{
		if(!empty($data_id)) {
			$this->db->where('id',$data_id);
			$row=$this->db->get('userdetails')->row();
			if($row->user_status == 'Active'){
				$data=array(
					'user_status' => 'Inactive'
				);
				$this->db->where('id',$data_id);
				$this->db->update('userdetails',$data);
			}
			else{
				$data=array(
					'user_status' => 'Active'
				);
				$this->db->where('id',$data_id);
				$this->db->update('userdetails',$data);
			}
		}

		

	}

	// update driver status call
	function statusdriver($data_id)
	{
		if(!empty($data_id)) {
			$this->db->where('id',$data_id);
			$row=$this->db->get('driver_details')->row();
			if($row->status == 'Active'){
				$data=array(
					'status' => 'Inactive'
				);
				$this->db->where('id',$data_id);
				if($this->db->update('driver_details',$data)){
					return true;
				}
				else{
					return false;
				}
			}
			else{
				$data=array(
					'status' => 'Active'
				);
				$this->db->where('id',$data_id);
				if($this->db->update('driver_details',$data)){
					return false;
				}
				else{
					return false;
				}
			}
		}
		

	}

	// calculate ride rates
		function calculaterates($pickup_date_time,$cab_id,$approx_distance,$approx_time)
		{
			$this->db->where('cab_id',$cab_id);
			$query=$this->db->get('cabdetails');
			$row = $query->row();
			$initial_km=$row->intialkm;
			$initial_rate=$row->car_rate;
			$night_initial_rate=$row->night_intailrate;
			$after_initial_km_rate=$row->fromintailrate;
			$night_after_initial_km_rate=$row->night_fromintailrate;
			$per_minute_rate=$row->ride_time_rate;
			$night_per_minute_rate=$row->night_ride_time_rate;

			$myDate = new DateTime();
        	//$myDate->setTimestamp(strtotime($request->book_date));
        	$myDate->setTimestamp(strtotime($pickup_date_time));

        	$time = $myDate->format("H");

        	$query1=$this->db->get('time_detail');
			$row1 = $query1->row();
        	//if ($time >= 22 || $time <= 6)
        	if((float)$time >= $row1->day_end_time || (float)$time <= $row1->day_start_time)
        	{
            	$timetype = 'night';
        	} else {
            	$timetype = 'day';
        	}

			if($approx_distance && (float)$approx_distance>$initial_km)
			{
				$remaining_km=$approx_distance-$initial_km;
				if($timetype=='day'){
					// calculate distance rate
					$new_after_initial_km_rate=$after_initial_km_rate*$remaining_km;
					$total_distance_rate=$initial_rate+$new_after_initial_km_rate;
					// calculate driver rate
					$total_driver_rate=$per_minute_rate*$approx_time;
					// total rate
					$total_rate=$total_distance_rate+$total_driver_rate;
				}
				else if($timetype=='night'){
					// calculate night distance rate
					$night_new_after_initial_km_rate=$night_after_initial_km_rate*$remaining_km;
					$night_total_distance_rate=$night_initial_rate+$night_new_after_initial_km_rate;
					// calculate night driver rate
					$night_total_driver_rate=$night_per_minute_rate*$approx_time;
					// total rate
					$total_rate=$night_total_distance_rate+$night_total_driver_rate;
				}
			}
			else{
				if($timetype=='day'){
					// calculate distance rate
					$total_distance_rate=$initial_rate;
					// calculate driver rate
					$total_driver_rate=$per_minute_rate*$approx_time;
					// total rate
					$total_rate=$total_distance_rate+$total_driver_rate;
				}
				else if($timetype=='night'){
					// calculate night distance rate
					$night_total_distance_rate=$night_initial_rate;
					// calculate night driver rate
					$night_total_driver_rate=$night_per_minute_rate*$approx_time;
					// total night rate
					$total_rate=$night_total_distance_rate+$night_total_driver_rate;
				}
			}
			return $total_rate;
		}
	
}
?>
