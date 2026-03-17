import * as courseService from '../services/course.service.js';
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const courseData = req.body;

    if (!courseData.name || !courseData.code) {
      return res.status(400).json({
        success: false,
        message: 'Course name and code are required'
      });
    }

    const result = await courseService.updateCourse(id, courseData);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in updateCourse controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};


const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await courseService.deleteCourse(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in deleteCourse controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};


const getCourseSessions = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await courseService.getCourseSessions(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getCourseSessions controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};


const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await courseService.getCourseById(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getCourseById controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};


const getAllCourses = async (req, res) => {
  try {
    const result = await courseService.getAllCourses();

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getAllCourses controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export {
  updateCourse,
  deleteCourse,
  getCourseSessions,
  getCourseById,
  getAllCourses
};
