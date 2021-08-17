window.onload = () => {
  let check = document.getElementById("show");
  check.addEventListener("change", function(e) {
    if(check.checked == true) {
      document.querySelector("input[type=password]").setAttribute("type", "text");
    }else{
      document.querySelector(".password").setAttribute("type", "password");
    }
  });
};